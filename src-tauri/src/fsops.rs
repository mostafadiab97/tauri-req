//! Files for the core: the operations reqochet's core uses from Node's `fs`, with Node's error codes
//! (ENOENT, EEXIST, EPERM, …) so the unchanged core code can react to them as before.
//! Every command checks that it was called by the hidden core web view, never by the screens.
use base64::Engine;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

#[derive(Debug, Serialize)]
pub struct FsErr {
    pub code: String,
    pub message: String,
}

pub type R<T> = Result<T, FsErr>;

pub fn denied() -> FsErr {
    FsErr { code: "EACCES".into(), message: "only the core may call this".into() }
}

/// Node's error code for an I/O error (the names the core checks: ENOENT, EEXIST, ENOTEMPTY, EPERM, EBUSY…).
pub fn node_code(e: &std::io::Error) -> &'static str {
    #[cfg(windows)]
    if let Some(raw) = e.raw_os_error() {
        return match raw {
            2 | 3 | 15 | 161 => "ENOENT",
            5 => "EPERM",
            32 | 33 => "EBUSY",
            80 | 183 => "EEXIST",
            145 => "ENOTEMPTY",
            267 => "ENOTDIR",
            17 => "EXDEV",
            112 => "ENOSPC",
            123 => "EINVAL",
            206 => "ENAMETOOLONG",
            _ => "EIO",
        };
    }
    #[cfg(unix)]
    if let Some(raw) = e.raw_os_error() {
        return match raw {
            1 => "EPERM",
            2 => "ENOENT",
            13 => "EACCES",
            16 => "EBUSY",
            17 => "EEXIST",
            18 => "EXDEV",
            20 => "ENOTDIR",
            21 => "EISDIR",
            22 => "EINVAL",
            28 => "ENOSPC",
            36 => "ENAMETOOLONG",
            39 => "ENOTEMPTY",
            _ => "EIO",
        };
    }
    match e.kind() {
        std::io::ErrorKind::NotFound => "ENOENT",
        std::io::ErrorKind::AlreadyExists => "EEXIST",
        std::io::ErrorKind::PermissionDenied => "EPERM",
        _ => "EIO",
    }
}

pub fn err(e: std::io::Error, syscall: &str, path: &str) -> FsErr {
    let code = node_code(&e);
    FsErr { code: code.into(), message: format!("{code}: {e}, {syscall} '{path}'") }
}

#[derive(Serialize)]
pub struct Entry {
    pub name: String,
    pub kind: &'static str,
}

#[derive(Serialize)]
pub struct Stat {
    pub size: u64,
    #[serde(rename = "mtimeMs")]
    pub mtime_ms: f64,
    pub kind: &'static str,
}

fn kind_of(t: fs::FileType) -> &'static str {
    if t.is_symlink() {
        "symlink"
    } else if t.is_dir() {
        "dir"
    } else if t.is_file() {
        "file"
    } else {
        "other"
    }
}

pub fn read(path: &str) -> R<Vec<u8>> {
    fs::read(path).map_err(|e| err(e, "open", path))
}

/// Writes a file; `exclusive` = Node's flag 'wx' (fails when the file exists). The data is flushed to disk.
pub fn write(path: &str, data: &[u8], append: bool, exclusive: bool) -> R<()> {
    let mut o = fs::OpenOptions::new();
    if append {
        o.append(true).create(true);
    } else if exclusive {
        o.write(true).create_new(true);
    } else {
        o.write(true).create(true).truncate(true);
    }
    let mut f = o.open(path).map_err(|e| err(e, "open", path))?;
    f.write_all(data).map_err(|e| err(e, "write", path))?;
    if !append {
        f.sync_all().map_err(|e| err(e, "fsync", path))?;
    }
    Ok(())
}

pub fn mkdir(path: &str, recursive: bool) -> R<Option<String>> {
    if recursive {
        // Node returns the first folder created (undefined when it existed)
        let mut first: Option<PathBuf> = None;
        let mut p = PathBuf::from(path);
        while !p.exists() {
            first = Some(p.clone());
            if !p.pop() {
                break;
            }
        }
        fs::create_dir_all(path).map_err(|e| err(e, "mkdir", path))?;
        Ok(first.map(|p| p.to_string_lossy().into_owned()))
    } else {
        fs::create_dir(path).map_err(|e| err(e, "mkdir", path))?;
        Ok(None)
    }
}

pub fn readdir(path: &str) -> R<Vec<Entry>> {
    let mut out = Vec::new();
    for d in fs::read_dir(path).map_err(|e| err(e, "scandir", path))? {
        let d = d.map_err(|e| err(e, "scandir", path))?;
        let kind = d.file_type().map(kind_of).unwrap_or("other");
        out.push(Entry { name: d.file_name().to_string_lossy().into_owned(), kind });
    }
    Ok(out)
}

pub fn stat(path: &str, link: bool) -> R<Stat> {
    let m = if link { fs::symlink_metadata(path) } else { fs::metadata(path) }.map_err(|e| err(e, if link { "lstat" } else { "stat" }, path))?;
    let mtime_ms = m
        .modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs_f64() * 1000.0)
        .unwrap_or(0.0);
    Ok(Stat { size: m.len(), mtime_ms, kind: kind_of(m.file_type()) })
}

pub fn rename(from: &str, to: &str) -> R<()> {
    fs::rename(from, to).map_err(|e| err(e, "rename", from))
}

pub fn rm(path: &str, recursive: bool, force: bool) -> R<()> {
    let m = match fs::symlink_metadata(path) {
        Ok(m) => m,
        Err(e) if force && e.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(e) => return Err(err(e, "rm", path)),
    };
    let r = if m.is_dir() {
        if !recursive {
            return Err(FsErr { code: "ERR_FS_EISDIR".into(), message: format!("Path is a directory: rm returned EISDIR (is a directory) {path}") });
        }
        fs::remove_dir_all(path)
    } else {
        fs::remove_file(path)
    };
    r.map_err(|e| err(e, "rm", path))
}

pub fn rmdir(path: &str) -> R<()> {
    fs::remove_dir(path).map_err(|e| err(e, "rmdir", path))
}

pub fn copy(from: &str, to: &str, exclusive: bool) -> R<()> {
    if exclusive && Path::new(to).exists() {
        return Err(FsErr { code: "EEXIST".into(), message: format!("EEXIST: file already exists, copyfile '{from}' -> '{to}'") });
    }
    fs::copy(from, to).map(|_| ()).map_err(|e| err(e, "copyfile", from))
}

/// Recursive copy (Node's `cp` with force: false — existing files are kept).
pub fn cp(from: &str, to: &str, force: bool) -> R<()> {
    let m = fs::metadata(from).map_err(|e| err(e, "cp", from))?;
    if m.is_dir() {
        fs::create_dir_all(to).map_err(|e| err(e, "mkdir", to))?;
        for d in fs::read_dir(from).map_err(|e| err(e, "scandir", from))? {
            let d = d.map_err(|e| err(e, "scandir", from))?;
            let name = d.file_name();
            cp(&Path::new(from).join(&name).to_string_lossy(), &Path::new(to).join(&name).to_string_lossy(), force)?;
        }
        Ok(())
    } else if !force && Path::new(to).exists() {
        Ok(())
    } else {
        fs::copy(from, to).map(|_| ()).map_err(|e| err(e, "cp", from))
    }
}

pub fn mkdtemp(prefix: &str) -> R<String> {
    use rand::Rng;
    const CHARS: &[u8] = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for _ in 0..20 {
        let mut rng = rand::rng();
        let suffix: String = (0..6).map(|_| CHARS[rng.random_range(0..CHARS.len())] as char).collect();
        let p = format!("{prefix}{suffix}");
        match fs::create_dir(&p) {
            Ok(()) => return Ok(p),
            Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(e) => return Err(err(e, "mkdtemp", prefix)),
        }
    }
    Err(FsErr { code: "EEXIST".into(), message: format!("mkdtemp failed for {prefix}") })
}

/// One request of the synchronous channel (the few `…Sync` calls of the core: existsSync, mkdirSync, the log file).
#[derive(Deserialize)]
pub struct SyncReq {
    pub op: String,
    #[serde(default)]
    pub path: String,
    #[serde(default)]
    pub to: String,
    #[serde(default)]
    pub data: String,
    #[serde(default)]
    pub b64: bool,
    #[serde(default)]
    pub flag: bool,
}

pub fn sync_op(r: SyncReq) -> serde_json::Value {
    use serde_json::json;
    let b64 = base64::engine::general_purpose::STANDARD;
    let res: R<serde_json::Value> = (|| {
        Ok(match r.op.as_str() {
            "exists" => json!(Path::new(&r.path).exists()),
            "read" => {
                let bytes = read(&r.path)?;
                if r.b64 { json!(b64.encode(bytes)) } else { json!(String::from_utf8_lossy(&bytes)) }
            }
            "write" | "append" => {
                let bytes = if r.b64 { b64.decode(&r.data).unwrap_or_default() } else { r.data.clone().into_bytes() };
                write(&r.path, &bytes, r.op == "append", false)?;
                json!(null)
            }
            "mkdir" => json!(mkdir(&r.path, r.flag)?),
            "readdir" => json!(readdir(&r.path)?),
            "stat" => json!(stat(&r.path, r.flag)?),
            "rename" => {
                rename(&r.path, &r.to)?;
                json!(null)
            }
            "rm" => {
                rm(&r.path, r.flag, true)?;
                json!(null)
            }
            "mkdtemp" => json!(mkdtemp(&r.path)?),
            _ => return Err(FsErr { code: "EINVAL".into(), message: format!("unknown op {}", r.op) }),
        })
    })();
    match res {
        Ok(v) => json!({ "ok": v }),
        Err(e) => json!({ "err": e }),
    }
}
