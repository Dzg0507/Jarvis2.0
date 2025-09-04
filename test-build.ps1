# Test Build Script for Jarvis 2.0
# This script tests the build process and verifies the fix

$Host.UI.RawUI.WindowTitle = "Jarvis 2.0 - Test Build"
Clear-Host

Write-Host "=== JARVIS 2.0 BUILD TEST ===" -ForegroundColor Cyan
Write-Host ""

# Function to check if a process is running on a port
function Test-Port {
    param([int]$Port)
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
        return $connection
    } catch {
        return $false
    }
}

# Step 1: Clean previous builds
Write-Host "[1/6] Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path ".next") { Remove-Item -Recurse -Force ".next" }
if (Test-Path "dist-electron") { Remove-Item -Recurse -Force "dist-electron" }
if (Test-Path "dist-mcp") { Remove-Item -Recurse -Force "dist-mcp" }
Write-Host "✅ Cleanup complete" -ForegroundColor Green
Write-Host ""

# Step 2: Install dependencies
Write-Host "[2/6] Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm install failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 3: Build the application
Write-Host "[3/6] Building application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build complete" -ForegroundColor Green
Write-Host ""

# Step 4: Verify build outputs
Write-Host "[4/6] Verifying build outputs..." -ForegroundColor Yellow
$buildChecks = @(
    @{ Path = ".next/BUILD_ID"; Name = "Next.js build" },
    @{ Path = "dist-mcp/mcp-main.js"; Name = "MCP server build" },
    @{ Path = "electron/main.js"; Name = "Electron main" },
    @{ Path = "electron/preload.js"; Name = "Electron preload" }
)

$allGood = $true
foreach ($check in $buildChecks) {
    if (Test-Path $check.Path) {
        Write-Host "✅ $($check.Name)" -ForegroundColor Green
    } else {
        Write-Host "❌ $($check.Name) - Missing: $($check.Path)" -ForegroundColor Red
        $allGood = $false
    }
}

if (-not $allGood) {
    Write-Host "❌ Build verification failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 5: Package the application
Write-Host "[5/6] Packaging application..." -ForegroundColor Yellow
npx electron-builder --win --x64
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Packaging failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Packaging complete" -ForegroundColor Green
Write-Host ""

# Step 6: Test the packaged application
Write-Host "[6/6] Testing packaged application..." -ForegroundColor Yellow

if (Test-Path "dist-electron/win-unpacked/jarvis-local.exe") {
    Write-Host "✅ Executable created" -ForegroundColor Green
    
    # Run diagnostics
    Write-Host "Running diagnostics..." -ForegroundColor Gray
    Push-Location "dist-electron/win-unpacked"
    node "../../debug-packaged-app.js"
    Pop-Location
    
    Write-Host ""
    Write-Host "🚀 BUILD TEST COMPLETE!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Navigate to: dist-electron/win-unpacked/" -ForegroundColor White
    Write-Host "2. Run: jarvis-local.exe" -ForegroundColor White
    Write-Host "3. Verify the app loads correctly (no black screen)" -ForegroundColor White
    Write-Host ""
    
    # Ask if user wants to run the app
    $runApp = Read-Host "Would you like to run the packaged app now? (y/n)"
    if ($runApp -eq 'y' -or $runApp -eq 'Y') {
        Write-Host "Starting packaged application..." -ForegroundColor Cyan
        Start-Process "dist-electron/win-unpacked/jarvis-local.exe"
        Write-Host "App started! Check if it loads correctly." -ForegroundColor Green
    }
    
} else {
    Write-Host "❌ Executable not found" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
