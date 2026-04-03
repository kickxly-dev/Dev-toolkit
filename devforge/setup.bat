@echo off
setlocal enabledelayedexpansion

echo.
echo  ========================================
echo   DevForge - Setup ^& Launch
echo  ========================================
echo.

:: Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js is not installed.
    echo  Download it from https://nodejs.org
    pause
    exit /b 1
)

:: Check for pnpm
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo  [INFO] pnpm not found, installing...
    npm install -g pnpm
    if %errorlevel% neq 0 (
        echo  [ERROR] Failed to install pnpm.
        pause
        exit /b 1
    )
)

:: Check for Rust
where rustc >nul 2>nul
if %errorlevel% neq 0 (
    echo  [WARN] Rust is not installed. Desktop mode will not work.
    echo  Install from https://rustup.rs
    echo  Continuing with browser-only mode...
    set NO_RUST=1
) else (
    set NO_RUST=0
)

:: Navigate to this script's directory (the devforge folder)
cd /d "%~dp0"

:: Install dependencies
echo.
echo  [1/2] Installing dependencies...
call pnpm install
if %errorlevel% neq 0 (
    echo  [ERROR] Failed to install dependencies.
    pause
    exit /b 1
)

echo.
echo  [2/2] Starting DevForge...
echo.

if "%NO_RUST%"=="1" (
    echo  Running in browser mode (no Rust toolchain found)
    echo  Open http://localhost:5173 in your browser
    echo.
    call pnpm dev
) else (
    echo  Choose launch mode:
    echo    1. Desktop app (Tauri)
    echo    2. Browser only (Vite dev server)
    echo.
    set /p MODE="  Enter choice (1 or 2): "
    if "!MODE!"=="2" (
        echo.
        echo  Starting Vite dev server...
        echo  Open http://localhost:5173 in your browser
        echo.
        call pnpm dev
    ) else (
        echo.
        echo  Launching desktop app (first run compiles Rust, may take a few minutes)...
        echo.
        call pnpm tauri dev
    )
)

pause
