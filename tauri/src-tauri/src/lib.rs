//! reqochet on Tauri (preview, design C): one window shows reqochet's screens, unchanged; reqochet's core, unchanged,
//! runs in a Web Worker inside it. The worker reaches Rust only over its own channel with a key it alone holds
//! (`core.rs`): files, Git, folder watching, PDF. The screens get window-level things only (the commands below and the
//! dialog, opener, updater and process plugins, which they also run for the worker).
mod core;
mod fsops;
mod pdf;
mod procs;
mod single;
mod watch;

use fsops::{denied, R};
use serde::Serialize;
use std::collections::HashMap;
use tauri::{AppHandle, Manager, Runtime, WebviewUrl, WebviewWindowBuilder};

/// The preview's name for its data folder and logs (installs next to the Electron reqochet-dev: other name, app ID,
/// install folder and data folder).
pub const APP_NAME: &str = "reqochet-dev-tauri-preview";

/// What the screens may know about the app (no environment, no folders — those are the core's).
#[derive(Serialize)]
struct AppInfo {
    name: &'static str,
    version: String,
    platform: &'static str,
    arch: &'static str,
    packaged: bool,
    test_out: Option<String>,
    test: Option<String>,
    test_data: Option<u32>,
    probe_repo: Option<String>,
    probe_pdf: Option<String>,
}

fn platform() -> &'static str {
    match std::env::consts::OS {
        "windows" => "win32",
        o => o,
    }
}
fn arch() -> &'static str {
    match std::env::consts::ARCH {
        "x86_64" => "x64",
        "aarch64" => "arm64",
        a => a,
    }
}

#[tauri::command]
fn app_info(app: AppHandle) -> AppInfo {
    AppInfo {
        name: APP_NAME,
        version: app.package_info().version.to_string(),
        platform: platform(),
        arch: arch(),
        packaged: !cfg!(debug_assertions),
        test_out: std::env::var("REQOCHET_TEST_OUT").ok(),
        test: std::env::var("REQOCHET_TEST").ok(),
        test_data: std::env::var("REQOCHET_TEST_DATA").ok().and_then(|v| v.parse().ok()),
        probe_repo: std::env::var("REQOCHET_PROBE_REPO").ok(),
        probe_pdf: std::env::var("REQOCHET_PROBE_PDF").ok(),
    }
}

/// Where reqochet keeps its settings: `--user-data-dir=` (e2e), REQOCHET_USER_DATA (tests), else
/// %APPDATA%\reqochet-dev-tauri-preview — its own folder, next to the Electron reqochet-dev's %APPDATA%\reqochet-dev.
fn user_dir<R: Runtime>(app: &AppHandle<R>) -> std::path::PathBuf {
    if let Some(a) = std::env::args().find_map(|a| a.strip_prefix("--user-data-dir=").map(String::from)) {
        return a.into();
    }
    if let Ok(d) = std::env::var("REQOCHET_USER_DATA") {
        return d.into();
    }
    app.path().data_dir().unwrap_or_else(|_| std::env::temp_dir()).join(APP_NAME)
}

/// What the core needs from its surroundings (Node gave it this): environment, folders, versions. Core channel only.
pub fn core_info<R: Runtime>(app: &AppHandle<R>) -> serde_json::Value {
    let s = |p: Result<std::path::PathBuf, tauri::Error>| p.map(|p| p.to_string_lossy().into_owned()).unwrap_or_default();
    let user = user_dir(app);
    let mut paths: HashMap<&str, String> = HashMap::new();
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
    serde_json::json!({
        "name": APP_NAME,
        "version": app.package_info().version.to_string(),
        "platform": platform(),
        "arch": arch(),
        "packaged": !cfg!(debug_assertions),
        "pid": std::process::id(),
        "env": std::env::vars().collect::<HashMap<String, String>>(),
        "args": std::env::args().collect::<Vec<String>>(),
        "paths": paths,
        "test_out": std::env::var("REQOCHET_TEST_OUT").ok(),
        "test": std::env::var("REQOCHET_TEST").ok(),
        "test_data": std::env::var("REQOCHET_TEST_DATA").ok().and_then(|v| v.parse::<u32>().ok()),
        "update_feed": update_feed(app),
    })
}

/// True when this build has an update feed (tauri.conf.json → plugins.updater.endpoints). The owner's preview has none,
/// like reqochet-dev from the private repository: it then reports "up to date" instead of a failed check.
fn update_feed<R: Runtime>(app: &AppHandle<R>) -> bool {
    app.config()
        .plugins
        .0
        .get("updater")
        .and_then(|u| u.get("endpoints"))
        .and_then(|e| e.as_array())
        .is_some_and(|e| !e.is_empty())
}

/// Opens a file or folder with its program, or shows it selected in the file manager (Electron's shell.openPath /
/// showItemInFolder). Started in the background: the file manager must never hold up the app.
pub fn shell_open(path: &str, reveal: bool) -> R<()> {
    let fail = |e: std::io::Error| fsops::err(e, "open", path);
    #[cfg(windows)]
    {
        let p = path.replace('/', "\\");
        let mut c = std::process::Command::new("explorer.exe");
        if reveal {
            c.arg(format!("/select,{p}"))
        } else {
            c.arg(&p)
        };
        c.spawn().map(|_| ()).map_err(fail)
    }
    #[cfg(not(windows))]
    {
        let target = if reveal { std::path::Path::new(path).parent().map(|p| p.to_string_lossy().into_owned()).unwrap_or(path.to_string()) } else { path.to_string() };
        std::process::Command::new("xdg-open").arg(target).spawn().map(|_| ()).map_err(fail)
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
/// per-profile data folder (separate e2e profiles), no slowing down of background work.
pub fn with_shared_webview_settings<'a, R: Runtime, M: Manager<R>>(b: WebviewWindowBuilder<'a, R, M>, app: &AppHandle<R>) -> WebviewWindowBuilder<'a, R, M> {
    let b = b.data_directory(user_dir(app).join("webview"));
    #[cfg(windows)]
    let b = {
        let mut args = String::from(
            "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection,CalculateNativeWinOcclusion --disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows",
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(watch::Watches::default())
        .manage(core::CoreKey::default())
        .register_asynchronous_uri_scheme_protocol("rqcore", |ctx, req, responder| {
            let app = ctx.app_handle().clone();
            let label = ctx.webview_label().to_string();
            tauri::async_runtime::spawn(async move { responder.respond(core::handle(app, label, req).await) });
        })
        .invoke_handler(tauri::generate_handler![app_info, test_report, app_exit, show_main])
        .setup(|app| {
            let handle = app.handle().clone();
            // one reqochet per data folder: a second start shows the open window and quits (single.rs)
            let dir = user_dir(&handle);
            if single::forward_to_running(&dir) {
                std::process::exit(0);
            }
            let shower = handle.clone();
            let _ = single::listen(&dir, move || {
                let h = shower.clone();
                let _ = shower.run_on_main_thread(move || {
                    if let Some(w) = h.get_webview_window("main") {
                        let _ = w.unminimize();
                        let _ = w.show();
                        let _ = w.set_focus();
                    }
                });
            });
            let opener = handle.clone();
            let main = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("reqochet-dev (Tauri preview)")
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
        .expect("error while running reqochet-dev (Tauri preview)");
}
