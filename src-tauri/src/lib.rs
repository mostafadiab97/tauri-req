//! reqochet on Tauri (proof): two web views share one Rust process.
//! - "main" shows reqochet's screens, unchanged; it reaches the core only through `window.reqochet`.
//! - "core" (hidden) runs reqochet's core code, unchanged, with Node's file, process and folder-watch calls answered
//!   by the Rust commands below. Only the core may call them (each command checks the caller's label).
mod fsops;
mod pdf;
mod procs;
mod watch;

use fsops::{denied, FsErr, R};
use serde::Serialize;
use std::collections::HashMap;
use tauri::ipc::{InvokeBody, Request, Response};
use tauri::{AppHandle, Manager, Runtime, State, Webview, WebviewUrl, WebviewWindowBuilder};

fn core_only(w: &Webview) -> R<()> {
    if w.label() == "core" { Ok(()) } else { Err(denied()) }
}

fn header(req: &Request<'_>, name: &str) -> String {
    req.headers()
        .get(name)
        .and_then(|v| v.to_str().ok())
        .map(|s| percent_encoding::percent_decode_str(s).decode_utf8_lossy().into_owned())
        .unwrap_or_default()
}

#[tauri::command]
async fn fs_read(w: Webview, path: String) -> R<Response> {
    core_only(&w)?;
    Ok(Response::new(fsops::read(&path)?))
}

/// Binary body = the file content; headers: path, flag ("w" | "wx" | "a").
#[tauri::command]
async fn fs_write(w: Webview, request: Request<'_>) -> R<()> {
    core_only(&w)?;
    let path = header(&request, "path");
    let flag = header(&request, "flag");
    let data: Vec<u8> = match request.body() {
        InvokeBody::Raw(b) => b.clone(),
        InvokeBody::Json(v) => v.as_str().unwrap_or_default().as_bytes().to_vec(),
    };
    fsops::write(&path, &data, flag == "a", flag == "wx")
}

#[tauri::command]
async fn fs_mkdir(w: Webview, path: String, recursive: bool) -> R<Option<String>> {
    core_only(&w)?;
    fsops::mkdir(&path, recursive)
}
#[tauri::command]
async fn fs_readdir(w: Webview, path: String) -> R<Vec<fsops::Entry>> {
    core_only(&w)?;
    fsops::readdir(&path)
}
#[tauri::command]
async fn fs_stat(w: Webview, path: String, link: bool) -> R<fsops::Stat> {
    core_only(&w)?;
    fsops::stat(&path, link)
}
#[tauri::command]
async fn fs_rename(w: Webview, from: String, to: String) -> R<()> {
    core_only(&w)?;
    fsops::rename(&from, &to)
}
#[tauri::command]
async fn fs_rm(w: Webview, path: String, recursive: bool, force: bool) -> R<()> {
    core_only(&w)?;
    fsops::rm(&path, recursive, force)
}
#[tauri::command]
async fn fs_rmdir(w: Webview, path: String) -> R<()> {
    core_only(&w)?;
    fsops::rmdir(&path)
}
#[tauri::command]
async fn fs_copy(w: Webview, from: String, to: String, exclusive: bool) -> R<()> {
    core_only(&w)?;
    fsops::copy(&from, &to, exclusive)
}
#[tauri::command]
async fn fs_cp(w: Webview, from: String, to: String, force: bool) -> R<()> {
    core_only(&w)?;
    fsops::cp(&from, &to, force)
}
#[tauri::command]
async fn fs_mkdtemp(w: Webview, prefix: String) -> R<String> {
    core_only(&w)?;
    fsops::mkdtemp(&prefix)
}

#[tauri::command]
async fn proc_run(w: Webview, req: procs::RunReq) -> R<procs::RunRes> {
    core_only(&w)?;
    tauri::async_runtime::spawn_blocking(move || procs::run(req))
        .await
        .map_err(|e| FsErr { code: "EIO".into(), message: e.to_string() })
}

#[tauri::command]
fn watch_start(w: Webview, app: AppHandle, state: State<'_, watch::Watches>, id: u32, path: String) -> R<()> {
    core_only(&w)?;
    watch::start(app, &state, id, path).map_err(|m| FsErr { code: "EIO".into(), message: m })
}
#[tauri::command]
fn watch_stop(w: Webview, state: State<'_, watch::Watches>, id: u32) -> R<()> {
    core_only(&w)?;
    watch::stop(&state, id);
    Ok(())
}

#[tauri::command]
async fn pdf_print(w: Webview, app: AppHandle, file: String, options: serde_json::Value) -> R<Response> {
    core_only(&w)?;
    pdf::print(app, file, options).await.map(Response::new).map_err(|m| FsErr { code: "EIO".into(), message: m })
}

/// Opens a file or folder with its program, or shows it selected in the file manager (Electron's shell.openPath /
/// showItemInFolder). Started in the background: the file manager must never hold up the app.
#[tauri::command]
async fn shell_open(w: Webview, path: String, reveal: bool) -> R<()> {
    core_only(&w)?;
    let fail = |e: std::io::Error| fsops::err(e, "open", &path);
    #[cfg(windows)]
    {
        let p = path.replace('/', "\\");
        let mut c = std::process::Command::new("explorer.exe");
        if reveal { c.arg(format!("/select,{p}")) } else { c.arg(&p) };
        c.spawn().map(|_| ()).map_err(fail)
    }
    #[cfg(not(windows))]
    {
        let target = if reveal { std::path::Path::new(&path).parent().map(|p| p.to_string_lossy().into_owned()).unwrap_or(path.clone()) } else { path.clone() };
        std::process::Command::new("xdg-open").arg(target).spawn().map(|_| ()).map_err(fail)
    }
}

#[derive(Serialize)]
struct AppInfo {
    name: String,
    version: String,
    platform: &'static str,
    arch: &'static str,
    packaged: bool,
    pid: u32,
    env: HashMap<String, String>,
    args: Vec<String>,
    paths: HashMap<&'static str, String>,
    test_out: Option<String>,
    test: Option<String>,
    test_data: Option<u32>,
}

/// Where reqochet keeps its settings: `--user-data-dir=` (e2e), REQOCHET_USER_DATA, else %APPDATA%\reqochet-tauri.
fn user_dir<R: Runtime>(app: &AppHandle<R>) -> std::path::PathBuf {
    if let Some(a) = std::env::args().find_map(|a| a.strip_prefix("--user-data-dir=").map(String::from)) {
        return a.into();
    }
    if let Ok(d) = std::env::var("REQOCHET_USER_DATA") {
        return d.into();
    }
    app.path().data_dir().unwrap_or_else(|_| std::env::temp_dir()).join("reqochet-tauri")
}

#[tauri::command]
fn app_info(w: Webview, app: AppHandle) -> AppInfo {
    let s = |p: Result<std::path::PathBuf, tauri::Error>| p.map(|p| p.to_string_lossy().into_owned()).unwrap_or_default();
    let user = user_dir(&app);
    let mut paths = HashMap::new();
    paths.insert("appData", s(app.path().data_dir()));
    paths.insert("userData", user.to_string_lossy().into_owned());
    paths.insert("logs", user.join("logs").to_string_lossy().into_owned());
    paths.insert("temp", std::env::temp_dir().to_string_lossy().into_owned());
    paths.insert("home", s(app.path().home_dir()));
    paths.insert("documents", s(app.path().document_dir()));
    paths.insert("desktop", s(app.path().desktop_dir()));
    paths.insert("downloads", s(app.path().download_dir()));
    paths.insert("resources", s(app.path().resource_dir()));
    paths.insert("exe", std::env::current_exe().map(|p| p.to_string_lossy().into_owned()).unwrap_or_default());
    let core = w.label() == "core";
    AppInfo {
        name: "reqochet-tauri".into(),
        version: app.package_info().version.to_string(),
        platform: match std::env::consts::OS { "windows" => "win32", o => o },
        arch: match std::env::consts::ARCH { "x86_64" => "x64", "aarch64" => "arm64", a => a },
        packaged: !cfg!(debug_assertions),
        pid: std::process::id(),
        // the screens get no environment (Electron's renderer had none either)
        env: if core { std::env::vars().collect() } else { HashMap::new() },
        args: std::env::args().collect(),
        paths: if core { paths } else { HashMap::new() },
        test_out: std::env::var("REQOCHET_TEST_OUT").ok(),
        test: std::env::var("REQOCHET_TEST").ok(),
        test_data: std::env::var("REQOCHET_TEST_DATA").ok().and_then(|v| v.parse().ok()),
    }
}

/// Test runs only (REQOCHET_TEST_OUT set): the screens hand their result file over, then the app ends.
#[tauri::command]
fn test_report(app: AppHandle, text: String, exit: bool) -> R<()> {
    let Ok(out) = std::env::var("REQOCHET_TEST_OUT") else { return Err(denied()) };
    fsops::write(&out, text.as_bytes(), false, false)?;
    if exit {
        app.exit(0);
    }
    Ok(())
}

#[tauri::command]
fn app_exit(app: AppHandle, code: i32) {
    app.exit(code);
}

#[tauri::command]
fn show_main(app: AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.set_focus();
    }
}

/// The same WebView2 settings for every web view (WebView2 refuses a second one with different browser options):
/// per-profile data folder (separate e2e profiles), and no slowing down of the hidden core view's timers.
pub fn with_shared_webview_settings<'a, R: Runtime, M: Manager<R>>(b: WebviewWindowBuilder<'a, R, M>, app: &AppHandle<R>) -> WebviewWindowBuilder<'a, R, M> {
    let b = b.data_directory(user_dir(app).join("webview"));
    #[cfg(windows)]
    let b = {
        let mut args = String::from(
            "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows",
        );
        // e2e only: the DevTools port the test harness connects to
        if let Ok(port) = std::env::var("REQOCHET_CDP_PORT") {
            if port.chars().all(|c| c.is_ascii_digit()) {
                args.push_str(&format!(" --remote-debugging-port={port}"));
            }
        }
        b.additional_browser_args(&args)
    };
    b
}

fn sync_protocol<R: Runtime>(ctx: tauri::UriSchemeContext<'_, R>, req: tauri::http::Request<Vec<u8>>) -> tauri::http::Response<Vec<u8>> {
    let body = if ctx.webview_label() != "core" {
        serde_json::json!({ "err": denied() })
    } else {
        match serde_json::from_slice::<fsops::SyncReq>(req.body()) {
            Ok(r) => fsops::sync_op(r),
            Err(e) => serde_json::json!({ "err": { "code": "EINVAL", "message": e.to_string() } }),
        }
    };
    tauri::http::Response::builder()
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .body(serde_json::to_vec(&body).unwrap_or_default())
        .unwrap()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(watch::Watches::default())
        .register_uri_scheme_protocol("rqsync", sync_protocol)
        .invoke_handler(tauri::generate_handler![
            fs_read, fs_write, fs_mkdir, fs_readdir, fs_stat, fs_rename, fs_rm, fs_rmdir, fs_copy, fs_cp, fs_mkdtemp,
            proc_run, watch_start, watch_stop, pdf_print, shell_open, app_info, test_report, app_exit, show_main
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            let core = WebviewWindowBuilder::new(app, "core", WebviewUrl::App("core.html".into())).visible(false).title("reqochet core");
            with_shared_webview_settings(core, &handle).build()?;
            let opener = handle.clone();
            let main = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("reqochet (Tauri preview)")
                .inner_size(1200.0, 800.0)
                .min_inner_size(800.0, 560.0)
                .visible(false)
                // HTML drag and drop (rows, files) works only without the native file-drop handler on Windows
                .disable_drag_drop_handler()
                .on_navigation(move |url| {
                    let internal = matches!(url.scheme(), "tauri" | "about") || url.host_str() == Some("tauri.localhost") || url.host_str() == Some("localhost");
                    if !internal && url.scheme() == "https" {
                        use tauri_plugin_opener::OpenerExt;
                        let _ = opener.opener().open_url(url.as_str(), None::<&str>);
                    }
                    internal
                });
            let main = with_shared_webview_settings(main, &handle).build()?;
            let h2 = handle.clone();
            main.on_window_event(move |e| {
                if let tauri::WindowEvent::Destroyed = e {
                    h2.exit(0);
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running reqochet-tauri");
}
