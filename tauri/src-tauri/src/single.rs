//! One reqochet per data folder (what Electron's requestSingleInstanceLock does): a second start with the same data
//! folder brings the open window forward and quits. Per data folder, not per app, so e2e tests can run several
//! instances side by side with their own folders (as with Electron).
//!
//! The first instance listens on a local port (127.0.0.1 only) and notes port and a random token in
//! <data folder>/instance.json; a second start connects, sends the token and "show", and ends when the first answers.
//! A stale file (the first instance is gone) simply fails to connect, and the new start takes over.
use std::io::{BufRead, BufReader, Write};
use std::net::{SocketAddr, TcpListener, TcpStream};
use std::path::Path;
use std::time::Duration;

const FILE: &str = "instance.json";

fn token() -> String {
    use rand::Rng;
    let mut rng = rand::rng();
    (0..16).map(|_| format!("{:02x}", rng.random::<u8>())).collect()
}

/// True when an instance with this data folder is already running and has been asked to show its window.
pub fn forward_to_running(dir: &Path) -> bool {
    let Ok(text) = std::fs::read_to_string(dir.join(FILE)) else { return false };
    let Ok(v) = serde_json::from_str::<serde_json::Value>(&text) else { return false };
    let (Some(port), Some(tok)) = (v["port"].as_u64(), v["token"].as_str()) else { return false };
    let addr = SocketAddr::from(([127, 0, 0, 1], port as u16));
    let Ok(mut s) = TcpStream::connect_timeout(&addr, Duration::from_millis(800)) else { return false };
    let _ = s.set_read_timeout(Some(Duration::from_secs(3)));
    if writeln!(s, "{tok} show").is_err() {
        return false;
    }
    let mut answer = String::new();
    BufReader::new(s).read_line(&mut answer).is_ok() && answer.trim() == "ok"
}

/// Becomes the running instance: listens for later starts and calls `on_show` for each valid one.
pub fn listen(dir: &Path, on_show: impl Fn() + Send + 'static) -> std::io::Result<()> {
    let listener = TcpListener::bind(("127.0.0.1", 0))?;
    let port = listener.local_addr()?.port();
    let tok = token();
    std::fs::create_dir_all(dir)?;
    std::fs::write(dir.join(FILE), serde_json::json!({ "port": port, "token": tok, "pid": std::process::id() }).to_string())?;
    std::thread::spawn(move || {
        for conn in listener.incoming().flatten() {
            let _ = conn.set_read_timeout(Some(Duration::from_secs(3)));
            let mut line = String::new();
            let mut reader = BufReader::new(&conn);
            if reader.read_line(&mut line).is_err() {
                continue;
            }
            // only a start that knows the token (read from our own data folder) may ask
            if line.trim() == format!("{tok} show") {
                on_show();
                let _ = (&conn).write_all(b"ok\n");
            }
        }
    });
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU32, Ordering};
    use std::sync::Arc;

    fn temp(name: &str) -> std::path::PathBuf {
        let d = std::env::temp_dir().join(format!("rq-single-{name}-{}", token()));
        std::fs::create_dir_all(&d).unwrap();
        d
    }

    #[test]
    fn a_second_start_reaches_the_first_and_shows_it() {
        let dir = temp("second");
        assert!(!forward_to_running(&dir), "no instance yet: start normally");
        let shown = Arc::new(AtomicU32::new(0));
        let s2 = shown.clone();
        listen(&dir, move || {
            s2.fetch_add(1, Ordering::SeqCst);
        })
        .unwrap();
        assert!(forward_to_running(&dir), "the second start is answered");
        assert_eq!(shown.load(Ordering::SeqCst), 1, "the first instance was asked to show its window");
    }

    #[test]
    fn other_data_folders_do_not_interfere() {
        let a = temp("a");
        let b = temp("b");
        listen(&a, || {}).unwrap();
        assert!(!forward_to_running(&b), "an instance with another data folder starts normally");
    }

    #[test]
    fn a_stale_file_or_wrong_token_is_ignored() {
        let dir = temp("stale");
        std::fs::write(dir.join(FILE), r#"{"port":1,"token":"x"}"#).unwrap();
        assert!(!forward_to_running(&dir), "nobody listens: start normally");
        listen(&dir, || {}).unwrap();
        let mut v: serde_json::Value = serde_json::from_str(&std::fs::read_to_string(dir.join(FILE)).unwrap()).unwrap();
        v["token"] = "wrong".into();
        std::fs::write(dir.join(FILE), v.to_string()).unwrap();
        assert!(!forward_to_running(&dir), "a wrong token gets no answer");
    }
}
