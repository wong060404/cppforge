@echo off
rem ---------------------------------------------------------------
rem  CppForge launcher
rem  Requires Node.js 24+ (built-in node:sqlite).
rem  First run: click "Environment check -> Install toolchain" in the UI.
rem
rem  NOTE: this file is intentionally ASCII-only with no parentheses
rem  blocks around Chinese text: cmd.exe reads .cmd in the OEM code page,
rem  and multi-byte characters inside ( ) blocks break parsing.
rem ---------------------------------------------------------------
setlocal
cd /d "%~dp0"

rem 1) Database (progress + code drafts). Kept inside the project so a
rem    "git pull" can never touch it.
if "%CPPFORGE_DB%"=="" set CPPFORGE_DB=%~dp0.data\cppforge.db
if not exist "%~dp0.data" mkdir "%~dp0.data" >nul 2>nul

rem 2) Toolchain home. MUST be a pure-ASCII path: MinGW ld.exe cannot
rem    open paths with non-ASCII characters. Prefer C:\CppForge, fall
rem    back to %TEMP% when that is not writable.
if not "%CPPFORGE_HOME%"=="" goto have_home
if exist "C:\CppForge\w64devkit\bin\g++.exe" goto use_c_cppforge
mkdir "C:\CppForge" >nul 2>nul
if exist "C:\CppForge" goto use_c_cppforge
set CPPFORGE_HOME=%TEMP%\cppforge-home
goto have_home

:use_c_cppforge
set CPPFORGE_HOME=C:\CppForge

:have_home
if "%CPPFORGE_PORT%"=="" set CPPFORGE_PORT=4173

echo.
echo   CppForge starting
echo   URL      http://127.0.0.1:%CPPFORGE_PORT%
echo   Database %CPPFORGE_DB%
echo   Toolchain %CPPFORGE_HOME%
echo.
echo   Keep this window open; closing it stops the server.
echo.

start "" /b cmd /c "timeout /t 2 >nul & start http://127.0.0.1:%CPPFORGE_PORT%"

node app\server\index.mjs
set EXITCODE=%ERRORLEVEL%

echo.
echo Server stopped (exit %EXITCODE%).
if not "%EXITCODE%"=="0" echo If it says EADDRINUSE, one is already running: open http://127.0.0.1:%CPPFORGE_PORT%
pause
