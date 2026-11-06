@echo off
title CareLink Telemedicine - Startup Launcher
color 0A

echo =====================================================================
echo    CareLink Telemedicine (TAH-013: Low-Bandwidth Rural Health)
echo    Starting Complete Application...
echo =====================================================================
echo.

:: 1. Verify Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not found on your system PATH!
    echo Please install Node.js from https://nodejs.org before running CareLink.
    pause
    exit /b 1
)

:: 2. Check existing port status
echo Checking network ports 5000 (Backend) and 5173 (Frontend)...
netstat -ano -p tcp | findstr /R ":5000 .*LISTENING" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Port 5000 is already active.
) else (
    echo [STARTING] Launching CareLink Express Backend on Port 5000...
    start "CareLink Backend (Port 5000)" cmd /k "cd /d %~dp0backend && npm run dev"
)

netstat -ano -p tcp | findstr /R ":5173 .*LISTENING" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Port 5173 is already active.
) else (
    echo [STARTING] Launching CareLink Vite Frontend on Port 5173...
    start "CareLink Frontend (Port 5173)" cmd /k "cd /d %~dp0 && npm run dev:frontend"
)

echo.
echo =====================================================================
echo    CareLink Services Initialized!
echo.
echo    Doctor Login:   doctor@carelink.org  /  RuralCare2026!
echo    Patient Login:  0418  /  RuralCare2026!
echo.
echo    Direct Application URLs:
echo      - Frontend (Vite):   http://127.0.0.1:5173
echo      - Backend + Direct:  http://127.0.0.1:5000
echo.
echo    Opening http://127.0.0.1:5173 in your default browser...
echo =====================================================================
echo.

timeout /t 3 /nobreak >nul
start http://127.0.0.1:5173

exit /b 0
