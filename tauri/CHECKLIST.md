# reqochet-dev (Tauri preview) — the owner's test

One section per build, newest first. Each build is a run in the playground's "Actions" list whose title ends in
"installer (installer kept)"; its installer is under "Artifacts" on the run page.

## Build 3 — icon (version 1.0.1)

Run: "tauri-windows-check — installer (installer kept)", 26 Nov 2026 (the link is in the CTO chat). Changes: the
program now always carries the current light icon, and the installer tells Windows to refresh its icon cache (an
install over an older build kept showing the old dark tile on the desktop shortcut and the taskbar).

1. Close the preview, run the build-3 installer over build 2.
   *Expected:* it installs without questions; reqochet-dev is untouched.
2. Look at the desktop shortcut and the Start-menu entry.
   *Expected:* the light tile (as reqochet-dev), not the old dark one. If the old one still shows, sign out and in
   once (Windows' icon cache) and note that you had to.
3. Start the preview from the desktop shortcut; look at the taskbar and the title bar.
   *Expected:* the light tile on the taskbar; the title bar follows the app's Light/Dark mode as before.
4. Open the sandbox, edit and save one item.
   *Expected:* as with build 2.
5. Report step, expected, got to the CTO chat.

## Build 2 — after the first report (version 1.0.1)

Run of 23 Nov 2026, 07:27 UTC (number 45131205478). Changes: window icon and title bar follow the app's Light/Dark
mode; PDF export without the extra accessibility data (4 MB instead of 18 MB). Checked by the owner on 26 Nov: title bar
fine, matrix the same as reqochet-dev; desktop shortcut and taskbar still showed the old dark tile (fixed in build 3).

## Build 1 — first preview (version 1.0.1)

Version 1.0.1 (the same screens as reqochet-dev 1.0.1). At most 5 steps (the CTO, 23 Nov 2026). Reports go to the CTO
chat as: step, expected, got.

1. Download the installer from the run page (signed in to GitHub) and run it.
   *Expected:* "reqochet-dev (Tauri preview)" appears in the Start menu next to reqochet-dev; the normal app is still
   there and unchanged.
2. Start the preview and open the sandbox project.
   *Expected:* the table shows the 10,005 items; note roughly how long the first opening took.
3. Add an item, edit and save it, change another and discard the change, then delete the new item.
   *Expected:* each works as in reqochet-dev; reqochet-dev shows the same result when it opens the project afterwards.
4. With the preview open, start it again from the Start menu.
   *Expected:* the open window comes forward; no second window.
5. Use it for normal work for a few days; write anything different, slower or broken as short reports (step,
   expected, got) and send them to the CTO chat.

Good to know: the preview keeps its own settings (`%APPDATA%\reqochet-dev-tauri-preview`) and is installed in
`%LOCALAPPDATA%\reqochet-dev (Tauri preview)`; it has no automatic updates — a new version comes as a new installer.
Uninstall: Windows Settings → Apps → "reqochet-dev (Tauri preview)".
