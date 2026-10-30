$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$AppDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ExePath = Join-Path $AppDir "DocTrack-LGU.exe"

if (Test-Path $ExePath) {
    $ShortcutPath = Join-Path $DesktopPath "DocTrack LGU.lnk"
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
    $Shortcut.TargetPath = $ExePath
    $Shortcut.WorkingDirectory = $AppDir
    $Shortcut.Description = "DocTrack LGU - Municipal Document Tracking & Routing Information System"
    $Shortcut.Save()
    Write-Host "✅ Desktop shortcut created successfully: DocTrack LGU on Desktop" -ForegroundColor Green
} else {
    Write-Host "⚠️ DocTrack-LGU.exe not found in $AppDir. Run 'npm run build:win' first." -ForegroundColor Yellow
}
