fn main() {
    // tauri-build embeds icons/icon.ico in the program but does not ask to run again when only that file changes —
    // with cached builds a program could keep an old icon (the owner saw the old dark tile on build 2's shortcuts)
    for icon in ["icons/icon.ico", "icons/32x32.png", "icons/128x128.png", "icons/128x128@2x.png", "icons/icon.png"] {
        println!("cargo:rerun-if-changed={icon}");
    }
    tauri_build::build()
}
