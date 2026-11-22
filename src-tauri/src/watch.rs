//! Folder watching for the core (Node's fs.watch on one folder, not recursive): each change is sent to the core web
//! view as an event { id, name } with the file name inside the watched folder.
use notify::{RecursiveMode, Watcher};
use serde::Serialize;
use std::collections::HashMap;
use std::path::Path;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

#[derive(Default)]
pub struct Watches(pub Mutex<HashMap<u32, notify::RecommendedWatcher>>);

#[derive(Clone, Serialize)]
struct Change {
    id: u32,
    event: &'static str,
    name: Option<String>,
}

pub fn start(app: AppHandle, state: &Watches, id: u32, folder: String) -> Result<(), String> {
    let base = Path::new(&folder).to_path_buf();
    let handle = app.clone();
    let inner = base.clone();
    let mut w = notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
        let Ok(ev) = res else {
            let _ = handle.emit_to(crate::core_label(), "fswatch", Change { id, event: "error", name: None });
            return;
        };
        let event = if matches!(ev.kind, notify::EventKind::Modify(notify::event::ModifyKind::Data(_))) { "change" } else { "rename" };
        if ev.paths.is_empty() {
            let _ = handle.emit_to(crate::core_label(), "fswatch", Change { id, event, name: None });
        }
        for p in ev.paths {
            let name = p.strip_prefix(&inner).ok().map(|r| r.to_string_lossy().into_owned()).filter(|s| !s.is_empty());
            let _ = handle.emit_to(crate::core_label(), "fswatch", Change { id, event, name });
        }
    })
    .map_err(|e| e.to_string())?;
    w.watch(&base, RecursiveMode::NonRecursive).map_err(|e| e.to_string())?;
    state.0.lock().unwrap().insert(id, w);
    Ok(())
}

pub fn stop(state: &Watches, id: u32) {
    state.0.lock().unwrap().remove(&id);
}
