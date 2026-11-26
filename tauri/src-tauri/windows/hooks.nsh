; Installer additions for reqochet-dev (Tauri preview), included by Tauri's NSIS installer.

!macro NSIS_HOOK_POSTINSTALL
  ; Installing over an older build keeps the same program path, and Windows keeps showing the old icon for its
  ; shortcuts from its icon cache. Tell Windows that icons changed, and refresh the per-user icon cache.
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
  nsExec::Exec '"$SYSDIR\ie4uinit.exe" -show'
!macroend
