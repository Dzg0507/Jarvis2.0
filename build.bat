@echo off
setlocal enabledelayedexpansion

:: Jarvis 2.0 - Enhanced Build Script for Windows
title Jarvis 2.0 Build Process
cls

:: --- Global Variables ---
set "TOTAL_STEPS=5"
set "CURRENT_STEP=0"
set "START_TIME=%time%"

:: --- Helper Functions ---
goto :main

:show_banner
echo +------------------------------------------+
echo ^|         JARVIS 2.0 BUILD TOOL          ^|
echo ^|        Enhanced Progress Tracking       ^|
echo +------------------------------------------+
echo.
goto :eof

:write_progress_bar
set "percent=%1"
set "status=%2"
set "operation=%3"

:: Create progress bar
set "bar_width=50"
set /a "filled_chars=percent*bar_width/100"
set /a "empty_chars=bar_width-filled_chars"

set "bar="
for /l %%i in (1,1,%filled_chars%) do set "bar=!bar!#"
for /l %%i in (1,1,%empty_chars%) do set "bar=!bar!-"

:: Calculate elapsed time (simplified)
echo   Progress: [!bar!] !percent!%% ^| !status!
if not "!operation!"=="" echo   -^> !operation!
goto :eof

:update_step_progress
set /a "CURRENT_STEP+=1"
set "step_name=%~1"
set "step_percent=%2"
if "!step_percent!"=="" set "step_percent=0"

set /a "overall_percent=(CURRENT_STEP-1)*100/TOTAL_STEPS + step_percent/TOTAL_STEPS"
call :write_progress_bar !overall_percent! "Step !CURRENT_STEP!/!TOTAL_STEPS!" "!step_name!"
goto :eof

:complete_step
set "message=%~1"
set /a "overall_percent=CURRENT_STEP*100/TOTAL_STEPS"
call :write_progress_bar !overall_percent! "Step !CURRENT_STEP!/!TOTAL_STEPS!" ""
echo.
echo   ✓ !message!
echo.
goto :eof

:error_exit
echo.
echo ✗ BUILD FAILED: %~1
echo.
echo Troubleshooting tips:
echo 1. Check if Node.js and npm are installed
echo 2. Run 'npm install' to ensure dependencies are installed
echo 3. Check the error message above for specific issues
echo 4. Try running 'npm run build' manually to see detailed errors
echo.
pause
exit /b 1

:: --- Mock Directories ---
:create_mock_dirs
set "mock_dirs=node_modules/@next/swc-darwin-arm64 node_modules/@next/swc-darwin-x64 node_modules/@next/swc-linux-x64-gnu node_modules/@next/swc-linux-x64-musl"
set "dir_count=0"
for %%d in (!mock_dirs!) do (
    set /a "dir_count+=1"
    set /a "percent=dir_count*100/4"
    call :update_step_progress "Creating %%d..." !percent!
    if not exist "%%d" mkdir "%%d" 2>nul
)
goto :eof

:cleanup_mock_dirs
set "mock_dirs=node_modules/@next/swc-darwin-arm64 node_modules/@next/swc-darwin-x64 node_modules/@next/swc-linux-x64-gnu node_modules/@next/swc-linux-x64-musl"
for %%d in (!mock_dirs!) do (
    if exist "%%d" (
        rmdir /s /q "%%d" 2>nul
        echo   -^> Removed %%d
    )
)
goto :eof

:: --- Main Script ---
:main
call :show_banner

:: --- Step 1: Clean Previous Builds ---
call :update_step_progress "Cleaning previous builds..." 0
if exist ".next" (
    rmdir /s /q ".next" 2>nul
    call :update_step_progress "Removed .next directory" 30
)
if exist "dist-electron" (
    rmdir /s /q "dist-electron" 2>nul
    call :update_step_progress "Removed dist-electron directory" 60
)
if exist "dist-mcp" (
    rmdir /s /q "dist-mcp" 2>nul
    call :update_step_progress "Removed dist-mcp directory" 90
)
call :complete_step "Previous builds cleaned"

:: --- Step 2: Build Applications ---
call :update_step_progress "Building Next.js application..." 0

:: Run the build command with better error handling
echo Running: npm run build
call npm run build
if !errorlevel! neq 0 call :error_exit "Next.js and MCP build failed"

call :update_step_progress "Build process completed" 100
call :complete_step "Application build complete"

:: --- Step 3: Verify Build Outputs ---
call :update_step_progress "Verifying build outputs..." 0

if not exist ".next/BUILD_ID" call :error_exit "Build verification failed: Missing .next/BUILD_ID"
call :update_step_progress "Checking Next.js build..." 33

if not exist "dist-mcp/mcp-main.js" call :error_exit "Build verification failed: Missing dist-mcp/mcp-main.js"
call :update_step_progress "Checking MCP server..." 66

if not exist "electron/main.js" call :error_exit "Build verification failed: Missing electron/main.js"
call :update_step_progress "Checking Electron files..." 100

call :complete_step "Build verification passed"

:: --- Step 4: Create Compatibility Directories ---
call :update_step_progress "Creating compatibility directories..." 0
call :create_mock_dirs
call :complete_step "Compatibility directories created"

:: --- Step 5: Package Electron Application ---
call :update_step_progress "Starting Electron packaging..." 0

:: Start electron-builder
echo Running: npx electron-builder --win --x64
call npx electron-builder --win --x64
if !errorlevel! neq 0 (
    call :cleanup_mock_dirs
    call :error_exit "Electron packaging failed"
)

call :update_step_progress "Packaging completed" 100
call :complete_step "Packaging complete"

:: --- Cleanup ---
echo.
echo Cleaning up temporary directories...
call :cleanup_mock_dirs
echo ✓ Cleanup complete.
echo.

:: --- Success Message ---
echo +------------------------------------------+
echo ^|       BUILD COMPLETED SUCCESSFULLY!      ^|
echo ^|                                          ^|
echo ^|   Your app is ready in: dist-electron    ^|
echo ^|   Look for: Jarvis 2.0 Setup.exe       ^|
echo +------------------------------------------+

:: --- Post-Build Verification ---
echo.
echo Verifying packaged application...
if exist "dist-electron\win-unpacked\jarvis-local.exe" (
    echo ✓ Executable file created
) else (
    echo ⚠ Executable file - Not found
)

if exist "dist-electron\jarvis-local Setup 2.0.0.exe" (
    echo ✓ Installer file created
) else (
    echo ⚠ Installer file - Not found
)

:: Open build folder
if exist "dist-electron" (
    echo.
    echo Opening build folder...
    start "" "dist-electron"
)

echo.
echo Next steps:
echo 1. Test the executable: dist-electron\win-unpacked\jarvis-local.exe
echo 2. If you see a black screen, check the troubleshooting guide
echo 3. Distribute the installer: Jarvis 2.0 Setup.exe

echo.
pause