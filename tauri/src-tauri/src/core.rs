//! The core's own channel to Rust (the owner's security condition, 22 Nov 2026): reqochet's core runs as a Web Worker
//! in the screens' web view, so Rust cannot tell the two apart by window. Instead the worker claims a random key once,
//! right after it starts (before any screen is drawn), and every file, Git, process, folder-watch and PDF call must
//! carry it. A second claim is refused, so the screens can never get the key; the old Tauri commands for these calls
//! no longer exist, so the screens cannot reach them any other way.
//!
//! Address: rqcore://localhost/<call>?k=<key>&… (Windows: http://rqcore.localhost/…). Bodies are plain text (JSON)
//! or raw bytes, so the browser sends them without an extra CORS round trip.
use crate::{fsops, pdf, procs, watch};
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::http::{Request, Response, StatusCode};
use tauri::{AppHandle, Manager};

/// The key only the core holds: handed out once.
pub struct CoreKey {
    key: String,
    claimed: AtomicBool,
}

impl Default for CoreKey {
    fn default() -> Self {
        use rand::Rng;
        let mut rng = rand::rng();
        let key = (0..32).map(|_| format!("{:02x}", rng.random::<u8>())).collect();
        CoreKey { key, claimed: AtomicBool::new(false) }
    }
}

impl CoreKey {
    /// The key for the first caller; None for every later one.
    pub fn claim(&self) -> Option<String> {
        if self.claimed.swap(true, Ordering::SeqCst) { None } else { Some(self.key.clone()) }
    }
    /// True only for the claimed key (compared in constant time).
    pub fn check(&self, given: &str) -> bool {
        if !self.claimed.load(Ordering::SeqCst) || given.len() != self.key.len() {
            return false;
        }
        given.bytes().zip(self.key.bytes()).fold(0u8, |acc, (a, b)| acc | (a ^ b)) == 0
    }
}

fn query(req: &Request<Vec<u8>>) -> HashMap<String, String> {
    req.uri()
        .query()
        .unwrap_or("")
        .split('&')
        .filter_map(|kv| kv.split_once('='))
        .map(|(k, v)| (k.to_string(), percent_encoding::percent_decode_str(v).decode_utf8_lossy().into_owned()))
        .collect()
}

fn reply(status: StatusCode, content_type: &str, body: Vec<u8>) -> Response<Vec<u8>> {
    Response::builder()
        .status(status)
        .header("Content-Type", content_type)
        .header("Access-Control-Allow-Origin", "*")
        .body(body)
        .unwrap()
}
fn json(v: impl serde::Serialize) -> Response<Vec<u8>> {
    reply(StatusCode::OK, "application/json", serde_json::to_vec(&v).unwrap_or_default())
}
fn fail(e: fsops::FsErr) -> Response<Vec<u8>> {
    reply(StatusCode::BAD_REQUEST, "application/json", serde_json::to_vec(&e).unwrap_or_default())
}
fn refused(why: &str) -> Response<Vec<u8>> {
    reply(StatusCode::FORBIDDEN, "application/json", serde_json::to_vec(&serde_json::json!({ "code": "EACCES", "message": why })).unwrap_or_default())
}
fn bad(m: impl ToString) -> fsops::FsErr {
    fsops::FsErr { code: "EINVAL".into(), message: m.to_string() }
}
fn body<T: for<'de> Deserialize<'de>>(req: &Request<Vec<u8>>) -> Result<T, fsops::FsErr> {
    serde_json::from_slice(req.body()).map_err(bad)
}

#[derive(Deserialize)]
struct PathArgs {
    path: String,
    #[serde(default)]
    to: String,
    #[serde(default)]
    recursive: bool,
    #[serde(default)]
    force: bool,
    #[serde(default)]
    link: bool,
    #[serde(default)]
    exclusive: bool,
}

/// Answers one request of the core. `label` = the web view it came from (only "main" holds the worker).
pub async fn handle(app: AppHandle, label: String, req: Request<Vec<u8>>) -> Response<Vec<u8>> {
    let key = app.state::<CoreKey>();
    if label != "main" {
        return refused("not from the app's window");
    }
    let call = req.uri().path().trim_start_matches('/').to_string();
    let q = query(&req);
    if call == "claim" {
        return match key.claim() {
            Some(k) => reply(StatusCode::OK, "text/plain", k.into_bytes()),
            None => refused("the core key was already handed out"),
        };
    }
    if !key.check(q.get("k").map(String::as_str).unwrap_or("")) {
        return refused("no valid core key");
    }
    let r: Result<Response<Vec<u8>>, fsops::FsErr> = (|| async {
        Ok(match call.as_str() {
            "info" => json(crate::core_info(&app)),
            "read" => reply(StatusCode::OK, "application/octet-stream", fsops::read(q.get("path").ok_or_else(|| bad("path"))?)?),
            "write" => {
                let flag = q.get("flag").map(String::as_str).unwrap_or("w");
                fsops::write(q.get("path").ok_or_else(|| bad("path"))?, req.body(), flag == "a", flag == "wx")?;
                json(serde_json::Value::Null)
            }
            "batch" => {
                let ops: Vec<fsops::BatchOp> = body(&req)?;
                json(tauri::async_runtime::spawn_blocking(move || fsops::batch(ops)).await.map_err(bad)?)
            }
            "mkdir" => {
                let a: PathArgs = body(&req)?;
                json(fsops::mkdir(&a.path, a.recursive)?)
            }
            "readdir" => json(fsops::readdir(&body::<PathArgs>(&req)?.path)?),
            "stat" => {
                let a: PathArgs = body(&req)?;
                json(fsops::stat(&a.path, a.link)?)
            }
            "rename" => {
                let a: PathArgs = body(&req)?;
                fsops::rename(&a.path, &a.to)?;
                json(serde_json::Value::Null)
            }
            "rm" => {
                let a: PathArgs = body(&req)?;
                fsops::rm(&a.path, a.recursive, a.force)?;
                json(serde_json::Value::Null)
            }
            "rmdir" => {
                fsops::rmdir(&body::<PathArgs>(&req)?.path)?;
                json(serde_json::Value::Null)
            }
            "copy" => {
                let a: PathArgs = body(&req)?;
                fsops::copy(&a.path, &a.to, a.exclusive)?;
                json(serde_json::Value::Null)
            }
            "cp" => {
                let a: PathArgs = body(&req)?;
                fsops::cp(&a.path, &a.to, a.force)?;
                json(serde_json::Value::Null)
            }
            "mkdtemp" => json(fsops::mkdtemp(&body::<PathArgs>(&req)?.path)?),
            "run" => {
                let run: procs::RunReq = body(&req)?;
                json(tauri::async_runtime::spawn_blocking(move || procs::run(run)).await.map_err(bad)?)
            }
            "watch_start" => {
                #[derive(Deserialize)]
                struct W {
                    id: u32,
                    path: String,
                }
                let w: W = body(&req)?;
                watch::start(app.clone(), &app.state::<watch::Watches>(), w.id, w.path).map_err(bad)?;
                json(serde_json::Value::Null)
            }
            "watch_stop" => {
                #[derive(Deserialize)]
                struct W {
                    id: u32,
                }
                watch::stop(&app.state::<watch::Watches>(), body::<W>(&req)?.id);
                json(serde_json::Value::Null)
            }
            "pdf" => {
                #[derive(Deserialize)]
                struct P {
                    file: String,
                    options: serde_json::Value,
                }
                let p: P = body(&req)?;
                reply(StatusCode::OK, "application/pdf", pdf::print(app.clone(), p.file, p.options).await.map_err(bad)?)
            }
            "open" => {
                #[derive(Deserialize)]
                struct O {
                    path: String,
                    reveal: bool,
                }
                let o: O = body(&req)?;
                crate::shell_open(&o.path, o.reveal)?;
                json(serde_json::Value::Null)
            }
            // the few synchronous calls (sync XHR from the worker: existsSync, the log file, …)
            "sync" => json(fsops::sync_op(body(&req)?)),
            _ => return Err(bad(format!("unknown core call {call}"))),
        })
    })()
    .await;
    r.unwrap_or_else(fail)
}

#[cfg(test)]
mod tests {
    use super::CoreKey;

    #[test]
    fn the_key_is_handed_out_once() {
        let k = CoreKey::default();
        let first = k.claim().expect("first claim gets the key");
        assert_eq!(first.len(), 64);
        assert!(k.claim().is_none(), "a second claim (the screens) is refused");
    }

    #[test]
    fn only_the_claimed_key_passes() {
        let k = CoreKey::default();
        assert!(!k.check(""), "nothing passes before the claim");
        let key = k.claim().unwrap();
        assert!(k.check(&key));
        assert!(!k.check(""));
        assert!(!k.check(&key[..63]));
        let mut wrong = key.clone().into_bytes();
        wrong[10] = if wrong[10] == b'a' { b'b' } else { b'a' };
        assert!(!k.check(&String::from_utf8(wrong).unwrap()));
    }

    #[test]
    fn keys_differ_between_starts() {
        assert_ne!(CoreKey::default().claim(), CoreKey::default().claim());
    }
}
