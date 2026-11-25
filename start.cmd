@echo off
rem Double-click to start the C learning platform.
rem This file must stay ASCII with CRLF line endings: cmd.exe reads it in the system code page.
cd /d "%~dp0"
echo Preparing the app, please wait...
call npx.cmd vite build --logLevel error
if errorlevel 1 goto failed
start "" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0."
exit /b 0
:failed
echo.
echo Build failed. Please send a screenshot of this window to the developer.
pause
exit /b 1
