@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer\build-local.ps1"
if errorlevel 1 echo Build failed. Review the console output.
pause
