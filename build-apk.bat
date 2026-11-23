@echo off
setlocal
cd /d "%~dp0"
echo SONIUM Android APK build
echo.
where node >nul 2>nul || (echo Node.js is required. Install Node.js LTS first. & pause & exit /b 1)
call npm install || (echo npm install failed. & pause & exit /b 1)
call npx eas-cli login
if errorlevel 1 (echo EAS login failed. & pause & exit /b 1)
call npx eas-cli build:configure
if errorlevel 1 (echo EAS configuration failed. & pause & exit /b 1)
echo.
echo Ensure app.json contains your EAS projectId, then starting APK build...
call npx eas-cli build --platform android --profile preview
pause
