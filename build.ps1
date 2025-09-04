# Jarvis 2.0 - Enhanced Build Script with Progress Tracking
$Host.UI.RawUI.WindowTitle = "Jarvis 2.0 Build Process"
Clear-Host

# --- Global Variables ---
$script:totalSteps = 5
$script:currentStep = 0
$script:startTime = Get-Date

# --- Enhanced Helper Functions ---
function Write-ProgressBar {
    param(
        [int]$Percent,
        [string]$Status = "",
        [string]$CurrentOperation = ""
    )
    $barWidth = 50
    $numChars = [math]::Floor($barWidth * $Percent / 100)
    $bar = ('#' * $numChars) + ('-' * ($barWidth - $numChars))

    # Calculate elapsed time
    $elapsed = (Get-Date) - $script:startTime
    $elapsedStr = "{0:mm\:ss}" -f $elapsed

    # Clear the line and write progress
    Write-Host -NoNewline "`r"
    Write-Host -NoNewline "  Progress: [$bar] $($Percent)% | $elapsedStr" -ForegroundColor Cyan

    if ($Status) {
        Write-Host -NoNewline " | $Status" -ForegroundColor Gray
    }

    if ($CurrentOperation) {
        Write-Host ""
        Write-Host "  -> $CurrentOperation" -ForegroundColor Yellow
    }
}

function Update-StepProgress {
    param(
        [string]$StepName,
        [int]$StepPercent = 0
    )
    $script:currentStep++
    $overallPercent = [math]::Floor((($script:currentStep - 1) / $script:totalSteps * 100) + ($StepPercent / $script:totalSteps))
    Write-ProgressBar -Percent $overallPercent -Status "Step $($script:currentStep)/$($script:totalSteps)" -CurrentOperation $StepName
}

function Complete-Step {
    param([string]$Message)
    $overallPercent = [math]::Floor($script:currentStep / $script:totalSteps * 100)
    Write-ProgressBar -Percent $overallPercent -Status "Step $($script:currentStep)/$($script:totalSteps)"
    Write-Host ""
    Write-Host "  ✅ $Message" -ForegroundColor Green
    Write-Host ""
}

function Show-Banner {
    Write-Host "+------------------------------------------+" -ForegroundColor Cyan
    Write-Host "|         JARVIS 2.0 BUILD TOOL          |" -ForegroundColor Cyan
    Write-Host "|        Enhanced Progress Tracking       |" -ForegroundColor Cyan
    Write-Host "+------------------------------------------+" -ForegroundColor Cyan
    Write-Host ""
}

# --- Mock Directories to Create ---
$mockDirs = @(
    "node_modules/@next/swc-darwin-arm64",
    "node_modules/@next/swc-darwin-x64",
    "node_modules/@next/swc-linux-x64-gnu",
    "node_modules/@next/swc-linux-x64-musl"
)

# --- Main Script ---
try {
    Show-Banner

    # --- Step 1: Clean Previous Builds ---
    Update-StepProgress -StepName "Cleaning previous builds..."
    if (Test-Path ".next") {
        Remove-Item -Recurse -Force ".next"
        Update-StepProgress -StepName "Removed .next directory" -StepPercent 30
    }
    if (Test-Path "dist-electron") {
        Remove-Item -Recurse -Force "dist-electron"
        Update-StepProgress -StepName "Removed dist-electron directory" -StepPercent 60
    }
    if (Test-Path "dist-mcp") {
        Remove-Item -Recurse -Force "dist-mcp"
        Update-StepProgress -StepName "Removed dist-mcp directory" -StepPercent 90
    }
    Complete-Step "Previous builds cleaned"

    # --- Step 2: Build Next.js and MCP Applications ---
    Update-StepProgress -StepName "Building Next.js application..."

    # Start the build process
    $buildProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "build" -NoNewWindow -PassThru -Wait

    # Simulate progress during build (since we can't track npm build progress directly)
    $buildSteps = @(
        "Compiling TypeScript...",
        "Building Next.js pages...",
        "Optimizing bundles...",
        "Building MCP server...",
        "Generating static assets..."
    )

    for ($i = 0; $i -lt $buildSteps.Length; $i++) {
        $percent = [math]::Floor(($i + 1) / $buildSteps.Length * 100)
        Update-StepProgress -StepName $buildSteps[$i] -StepPercent $percent
        Start-Sleep -Milliseconds 500
    }

    if ($buildProcess.ExitCode -ne 0) {
        throw "Next.js and MCP build failed."
    }

    Complete-Step "Application build complete"

    # --- Step 3: Verify Build Outputs ---
    Update-StepProgress -StepName "Verifying build outputs..."

    $buildChecks = @(
        @{ Path = ".next/BUILD_ID"; Name = "Next.js build" },
        @{ Path = "dist-mcp/mcp-main.js"; Name = "MCP server" },
        @{ Path = "electron/main.js"; Name = "Electron main process" }
    )

    $checkCount = 0
    foreach ($check in $buildChecks) {
        $checkCount++
        $percent = [math]::Floor($checkCount / $buildChecks.Length * 100)
        Update-StepProgress -StepName "Checking $($check.Name)..." -StepPercent $percent

        if (!(Test-Path $check.Path)) {
            throw "Build verification failed: Missing $($check.Path)"
        }
        Start-Sleep -Milliseconds 200
    }

    Complete-Step "Build verification passed"

    # --- Step 4: Create Compatibility Directories ---
    Update-StepProgress -StepName "Creating compatibility directories..."

    $dirCount = 0
    foreach ($dir in $mockDirs) {
        $dirCount++
        $percent = [math]::Floor($dirCount / $mockDirs.Length * 100)
        Update-StepProgress -StepName "Creating $dir..." -StepPercent $percent

        if (!(Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
        Start-Sleep -Milliseconds 100
    }

    Complete-Step "Compatibility directories created"

    # --- Step 5: Package Electron Application ---
    Update-StepProgress -StepName "Starting Electron packaging..."

    # Start electron-builder
    $packagingProcess = Start-Process -FilePath "npx.cmd" -ArgumentList "electron-builder", "--win", "--x64" -NoNewWindow -PassThru

    # Simulate packaging progress
    $packagingSteps = @(
        "Preparing application files...",
        "Copying dependencies...",
        "Creating executable...",
        "Generating installer...",
        "Finalizing package..."
    )

    $stepDuration = 15 # seconds per step
    for ($i = 0; $i -lt $packagingSteps.Length; $i++) {
        $percent = [math]::Floor(($i + 1) / $packagingSteps.Length * 100)
        Update-StepProgress -StepName $packagingSteps[$i] -StepPercent $percent

        # Wait for step duration or until process completes
        $waited = 0
        while ($waited -lt $stepDuration -and !$packagingProcess.HasExited) {
            Start-Sleep -Seconds 1
            $waited++
        }

        if ($packagingProcess.HasExited) {
            break
        }
    }

    # Wait for packaging to complete
    $packagingProcess.WaitForExit()

    if ($packagingProcess.ExitCode -ne 0) {
        throw "Electron packaging failed."
    }

    Complete-Step "Packaging complete"

} catch {
    Write-Host ""
    Write-Host "❌ BUILD FAILED: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting tips:" -ForegroundColor Yellow
    Write-Host "1. Check if Node.js and npm are installed" -ForegroundColor White
    Write-Host "2. Run 'npm install' to ensure dependencies are installed" -ForegroundColor White
    Write-Host "3. Check the error message above for specific issues" -ForegroundColor White
    Write-Host "4. Try running 'npm run build' manually to see detailed errors" -ForegroundColor White
    Write-Host ""
    exit 1
} finally {
    # --- Cleanup Step (Always Runs) ---
    Write-Host ""
    Write-Host "Cleaning up temporary directories..." -ForegroundColor Gray

    $cleanupCount = 0
    foreach ($dir in $mockDirs) {
        $cleanupCount++
        if (Test-Path $dir) {
            Remove-Item -Path $dir -Recurse -Force
            Write-Host "  -> Removed $dir" -ForegroundColor DarkGray
        }
    }
    Write-Host "✅ Cleanup complete." -ForegroundColor Green
    Write-Host ""
}

# --- Calculate Total Build Time ---
$totalTime = (Get-Date) - $script:startTime
$timeStr = if ($totalTime.TotalMinutes -ge 1) {
    "{0:mm\:ss}" -f $totalTime
} else {
    "{0:ss}s" -f $totalTime
}

# --- Success Message ---
Write-Host "+------------------------------------------+" -ForegroundColor Green
Write-Host "|       BUILD COMPLETED SUCCESSFULLY!      |" -ForegroundColor Green
Write-Host "|                                          |" -ForegroundColor Green
Write-Host "|   Your app is ready in: dist-electron    |" -ForegroundColor Green
Write-Host "|   Look for: Jarvis 2.0 Setup.exe       |" -ForegroundColor Green
Write-Host "|                                          |" -ForegroundColor Green
Write-Host "|   Total build time: $($timeStr.PadLeft(13)) |" -ForegroundColor Green
Write-Host "+------------------------------------------+" -ForegroundColor Green

# --- Post-Build Verification ---
Write-Host ""
Write-Host "Verifying packaged application..." -ForegroundColor Cyan

$verificationChecks = @(
    @{ Path = "dist-electron/win-unpacked/jarvis-local.exe"; Name = "Executable file" },
    @{ Path = "dist-electron/jarvis-local Setup 2.0.0.exe"; Name = "Installer file" },
    @{ Path = "dist-electron/win-unpacked/resources/app.asar"; Name = "Application bundle" }
)

foreach ($check in $verificationChecks) {
    if (Test-Path $check.Path) {
        $fileSize = (Get-Item $check.Path).Length
        $fileSizeMB = [math]::Round($fileSize / 1MB, 1)
        Write-Host "✅ $($check.Name) ($fileSizeMB MB)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  $($check.Name) - Not found" -ForegroundColor Yellow
    }
}

# --- Run Quick Diagnostic ---
Write-Host ""
Write-Host "Running quick diagnostic..." -ForegroundColor Cyan
if (Test-Path "dist-electron/win-unpacked") {
    Push-Location "dist-electron/win-unpacked"
    if (Test-Path "../../debug-packaged-app.js") {
        try {
            $diagnosticOutput = node "../../debug-packaged-app.js" 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Diagnostic passed - App should run correctly" -ForegroundColor Green
            } else {
                Write-Host "⚠️  Diagnostic found potential issues - Check manually" -ForegroundColor Yellow
                Write-Host $diagnosticOutput -ForegroundColor Red
            }
        } catch {
            Write-Host "⚠️  Could not run diagnostic - Manual testing recommended" -ForegroundColor Yellow
        }
    }
    Pop-Location
}

# Open the build folder
if (Test-Path "dist-electron") {
    Write-Host ""
    Write-Host "Opening build folder..." -ForegroundColor Cyan
    Invoke-Item "dist-electron"
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Test the executable: dist-electron/win-unpacked/jarvis-local.exe" -ForegroundColor White
Write-Host "2. If you see a black screen, check the troubleshooting guide" -ForegroundColor White
Write-Host "3. Distribute the installer: Jarvis 2.0 Setup.exe" -ForegroundColor White

Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
