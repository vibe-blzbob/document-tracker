@echo off
title Install DocTrack LGU Desktop Shortcut
cd /d "%~dp0"
echo Creating DocTrack LGU shortcut on your Windows Desktop...
powershell -ExecutionPolicy Bypass -File ".\create-desktop-shortcut.ps1"
echo.
pause
