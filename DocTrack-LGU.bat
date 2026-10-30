@echo off
title DocTrack LGU - Windows Launcher
cd /d "%~dp0"

echo ========================================================
echo  DocTrack LGU - Document Tracking & Routing System
echo ========================================================
echo.

:: 1. Launch native Windows executable if present
if exist "DocTrack-LGU.exe" (
    start "" "DocTrack-LGU.exe"
    exit
)

:: 2. Check if server is already responding
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:3001/api/network-info' -TimeoutSec 1; exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [1/2] Starting DocTrack LGU Background Server...
    if exist "dist-server\index.js" (
        start /b "" node dist-server\index.js >nul 2>&1
    ) else (
        start /b "" npm start >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
) else (
    echo [1/2] Server is already running on port 3001.
)

echo [2/2] Launching Windows Desktop Application Window...
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:3001 --window-size=1280,840
) else if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:3001 --window-size=1280,840
) else (
    start http://localhost:3001
)
exit
