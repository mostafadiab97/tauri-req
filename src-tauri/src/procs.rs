//! Running Git for the core (what Node's execFile/spawn did): arguments as a list (no shell), optional standard input,
//! a time limit and an output limit. Only `git` may be started.
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

#[derive(Deserialize)]
pub struct RunReq {
    pub file: String,
    pub args: Vec<String>,
    pub cwd: Option<String>,
    #[serde(default)]
    pub env: HashMap<String, String>,
    /// standard input, base64 (absent = no input; stdin is closed at once)
    pub input: Option<String>,
    pub timeout_ms: Option<u64>,
    pub max_buffer: Option<usize>,
}

#[derive(Serialize)]
pub struct RunRes {
    pub code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
    pub killed: bool,
    pub too_much: bool,
    pub spawn_error: Option<String>,
}

pub fn run(req: RunReq) -> RunRes {
    use base64::Engine;
    let b64 = base64::engine::general_purpose::STANDARD;
    let fail = |m: String| RunRes { code: None, stdout: String::new(), stderr: String::new(), killed: false, too_much: false, spawn_error: Some(m) };
    if req.file != "git" {
        return fail(format!("EACCES: only git may be started, not {}", req.file));
    }
    let mut cmd = Command::new(&req.file);
    cmd.args(&req.args).stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped());
    if let Some(cwd) = &req.cwd {
        cmd.current_dir(cwd);
    }
    // the environment is given whole by the core (it starts from process.env, which mirrors ours)
    if !req.env.is_empty() {
        cmd.env_clear();
        cmd.envs(&req.env);
    }
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW (Node's windowsHide)
    }
    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => return fail(format!("spawn {} {}: {e}", req.file, crate::fsops::node_code(&e))),
    };
    let input = req.input.and_then(|s| b64.decode(s).ok());
    let mut stdin = child.stdin.take();
    let writer = std::thread::spawn(move || {
        if let (Some(data), Some(si)) = (input, stdin.as_mut()) {
            let _ = si.write_all(&data);
        }
        drop(stdin);
    });
    let max = req.max_buffer.unwrap_or(64 * 1024 * 1024);
    let reader = |mut r: Box<dyn Read + Send>| {
        std::thread::spawn(move || {
            let mut buf = Vec::new();
            let mut chunk = [0u8; 65536];
            let mut over = false;
            loop {
                match r.read(&mut chunk) {
                    Ok(0) | Err(_) => break,
                    Ok(n) => {
                        if buf.len() + n > max {
                            over = true;
                        } else {
                            buf.extend_from_slice(&chunk[..n]);
                        }
                    }
                }
            }
            (buf, over)
        })
    };
    let out = reader(Box::new(child.stdout.take().unwrap()));
    let err = reader(Box::new(child.stderr.take().unwrap()));
    let deadline = req.timeout_ms.filter(|t| *t > 0).map(|t| Instant::now() + Duration::from_millis(t));
    let mut killed = false;
    let status = loop {
        match child.try_wait() {
            Ok(Some(s)) => break Some(s),
            Ok(None) => {
                if deadline.is_some_and(|d| Instant::now() > d) {
                    let _ = child.kill();
                    killed = true;
                    break child.wait().ok();
                }
                std::thread::sleep(Duration::from_millis(2));
            }
            Err(_) => break None,
        }
    };
    let _ = writer.join();
    let (stdout, o1) = out.join().unwrap_or_default();
    let (stderr, o2) = err.join().unwrap_or_default();
    RunRes {
        code: status.and_then(|s| s.code()),
        stdout: b64.encode(stdout),
        stderr: b64.encode(stderr),
        killed,
        too_much: o1 || o2,
        spawn_error: None,
    }
}
