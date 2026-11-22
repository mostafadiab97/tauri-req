//! HTML → PDF (what Electron's webContents.printToPDF did): a hidden web view without scripts loads the exported HTML
//! file and WebView2 prints it through the same Chromium call Electron uses (DevTools "Page.printToPDF"), so the
//! page size, margins and the translated page-number footer stay the same.
use tauri::AppHandle;

#[cfg(windows)]
pub async fn print(app: AppHandle, file: String, options: serde_json::Value) -> Result<Vec<u8>, String> {
    use base64::Engine;
    use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
    use tokio_like::oneshot;
    use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2;
    use windows::core::HSTRING;

    static COUNTER: std::sync::atomic::AtomicU32 = std::sync::atomic::AtomicU32::new(0);
    let label = format!("pdf{}", COUNTER.fetch_add(1, std::sync::atomic::Ordering::SeqCst));
    let url = tauri::Url::from_file_path(&file).map_err(|_| format!("not a file path: {file}"))?;
    let target = url.clone();
    let (loaded_tx, loaded_rx) = oneshot::channel::<()>();
    let loaded_tx = std::sync::Mutex::new(Some(loaded_tx));
    let builder = WebviewWindowBuilder::new(&app, &label, WebviewUrl::External("about:blank".parse().unwrap()))
        .visible(false)
        .focused(false)
        .on_navigation(move |u| u.scheme() == "about" || *u == target)
        .on_page_load(move |_w, p| {
            if p.url().scheme() == "file" && matches!(p.event(), tauri::webview::PageLoadEvent::Finished) {
                if let Some(tx) = loaded_tx.lock().unwrap().take() {
                    let _ = tx.send(());
                }
            }
        });
    let win = crate::with_shared_webview_settings(builder, &app).build().map_err(|e| e.to_string())?;
    let close = |w: &tauri::WebviewWindow| {
        let _ = w.destroy();
    };
    // scripts off before the document is loaded (the exported HTML needs none)
    win.with_webview(move |pw| unsafe {
        if let Ok(core) = pw.controller().CoreWebView2() {
            if let Ok(s) = core.Settings() {
                let _ = s.SetIsScriptEnabled(false.into());
            }
        }
    })
    .map_err(|e| e.to_string())?;
    // queued after the settings change (both run on the main thread, in order); never called from inside it
    win.navigate(url.clone()).map_err(|e| e.to_string())?;
    if tokio_like::timeout(180_000, loaded_rx).await.is_none() {
        close(&win);
        return Err("PDF: the document did not load in time".into());
    }
    let (tx, rx) = oneshot::channel::<Result<String, String>>();
    let tx = std::sync::Mutex::new(Some(tx));
    let params = options.to_string();
    win.with_webview(move |pw| unsafe {
        let send = move |r: Result<String, String>| {
            if let Some(tx) = tx.lock().unwrap().take() {
                let _ = tx.send(r);
            }
        };
        let core: ICoreWebView2 = match pw.controller().CoreWebView2() {
            Ok(c) => c,
            Err(e) => return send(Err(e.to_string())),
        };
        let send = std::sync::Arc::new(std::sync::Mutex::new(Some(send)));
        let s2 = send.clone();
        let handler = webview2_com::CallDevToolsProtocolMethodCompletedHandler::create(Box::new(move |hr, json| {
            if let Some(f) = s2.lock().unwrap().take() {
                f(hr.map(|_| json).map_err(|e| e.to_string()));
            }
            Ok(())
        }));
        if let Err(e) = core.CallDevToolsProtocolMethod(&HSTRING::from("Page.printToPDF"), &HSTRING::from(params.as_str()), &handler) {
            if let Some(f) = send.lock().unwrap().take() {
                f(Err(e.to_string()));
            }
        }
    })
    .map_err(|e| e.to_string())?;
    let result = tokio_like::timeout(180_000, rx).await;
    let _ = app.get_webview_window(&label).map(|w| close(&w));
    let json = result.ok_or_else(|| "PDF: printing took too long".to_string())??;
    let v: serde_json::Value = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    let data = v["data"].as_str().ok_or("PDF: no data from WebView2")?;
    base64::engine::general_purpose::STANDARD.decode(data).map_err(|e| e.to_string())
}

#[cfg(not(windows))]
pub async fn print(_app: AppHandle, _file: String, _options: serde_json::Value) -> Result<Vec<u8>, String> {
    Err("PDF export is built for Windows (WebView2) in this proof".into())
}

/// A one-shot channel and a timeout on Tauri's own async runtime (no extra dependency).
#[cfg(windows)]
mod tokio_like {
    pub mod oneshot {
        pub use std::sync::mpsc::Sender;
        pub struct Receiver<T>(std::sync::mpsc::Receiver<T>);
        pub fn channel<T>() -> (Sender<T>, Receiver<T>) {
            let (t, r) = std::sync::mpsc::channel();
            (t, Receiver(r))
        }
        impl<T> Receiver<T> {
            pub fn try_recv(&self) -> Option<T> {
                self.0.try_recv().ok()
            }
        }
    }
    /// Polls the receiver every 10 ms without blocking the UI thread.
    pub async fn timeout<T>(ms: u64, rx: oneshot::Receiver<T>) -> Option<T> {
        let start = std::time::Instant::now();
        loop {
            if let Some(v) = rx.try_recv() {
                return Some(v);
            }
            if start.elapsed().as_millis() as u64 > ms {
                return None;
            }
            tauri::async_runtime::spawn_blocking(|| std::thread::sleep(std::time::Duration::from_millis(10))).await.ok();
        }
    }
}
