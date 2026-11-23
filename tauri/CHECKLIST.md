# reqochet-dev (Tauri preview) — the owner's test

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
