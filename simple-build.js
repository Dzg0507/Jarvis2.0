#!/usr/bin/env node

/**
 * Jarvis 2.0 - Simple Build Script
 * Alternative to batch/PowerShell scripts using pure Node.js
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// Progress tracking
let currentStep = 0;
const totalSteps = 5;
const startTime = Date.now();

function showProgress(stepName, percent = 0) {
    currentStep++;
    const overallPercent = Math.floor(((currentStep - 1) / totalSteps * 100) + (percent / totalSteps));
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    const barWidth = 50;
    const filledChars = Math.floor(barWidth * overallPercent / 100);
    const emptyChars = barWidth - filledChars;
    const bar = '#'.repeat(filledChars) + '-'.repeat(emptyChars);
    
    console.log(`  Progress: [${bar}] ${overallPercent}% | ${minutes}:${seconds.toString().padStart(2, '0')} | Step ${currentStep}/${totalSteps}`);
    console.log(`  -> ${stepName}`);
}

function completeStep(message) {
    const overallPercent = Math.floor(currentStep / totalSteps * 100);
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    const barWidth = 50;
    const filledChars = Math.floor(barWidth * overallPercent / 100);
    const emptyChars = barWidth - filledChars;
    const bar = '#'.repeat(filledChars) + '-'.repeat(emptyChars);
    
    console.log(`  Progress: [${bar}] ${overallPercent}% | ${minutes}:${seconds.toString().padStart(2, '0')} | Step ${currentStep}/${totalSteps}`);
    console.log(`  ✓ ${message}\n`);
}

function errorExit(message) {
    console.log(`\n❌ BUILD FAILED: ${message}\n`);
    console.log('Troubleshooting tips:');
    console.log('1. Run: node fix-build-issues.js');
    console.log('2. Check if Node.js and npm are installed');
    console.log('3. Run: npm install');
    console.log('4. Check the error message above\n');
    process.exit(1);
}

function createMockDirs() {
    const mockDirs = [
        'node_modules/@next/swc-darwin-arm64',
        'node_modules/@next/swc-darwin-x64', 
        'node_modules/@next/swc-linux-x64-gnu',
        'node_modules/@next/swc-linux-x64-musl'
    ];
    
    mockDirs.forEach((dir, index) => {
        showProgress(`Creating ${dir}...`, (index + 1) * 100 / mockDirs.length);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

function cleanupMockDirs() {
    const mockDirs = [
        'node_modules/@next/swc-darwin-arm64',
        'node_modules/@next/swc-darwin-x64',
        'node_modules/@next/swc-linux-x64-gnu', 
        'node_modules/@next/swc-linux-x64-musl'
    ];
    
    mockDirs.forEach(dir => {
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
            console.log(`  -> Removed ${dir}`);
        }
    });
}

function runCommand(command, options = {}) {
    try {
        console.log(`Running: ${command}`);
        execSync(command, { 
            stdio: 'inherit', 
            encoding: 'utf8',
            ...options 
        });
    } catch (error) {
        throw new Error(`Command failed: ${command}\n${error.message}`);
    }
}

async function main() {
    console.log('+------------------------------------------+');
    console.log('|         JARVIS 2.0 BUILD TOOL          |');
    console.log('|        Simple Node.js Version          |');
    console.log('+------------------------------------------+\n');

    try {
        // Step 1: Clean Previous Builds
        showProgress('Cleaning previous builds...', 0);
        
        const dirsToClean = ['.next', 'dist-electron', 'dist-mcp'];
        dirsToClean.forEach((dir, index) => {
            if (fs.existsSync(dir)) {
                fs.rmSync(dir, { recursive: true, force: true });
                showProgress(`Removed ${dir} directory`, (index + 1) * 100 / dirsToClean.length);
            }
        });
        
        completeStep('Previous builds cleaned');

        // Step 2: Build Applications
        showProgress('Building Next.js and MCP applications...', 0);
        runCommand('npm run build');
        completeStep('Application build complete');

        // Step 3: Verify Build Outputs
        showProgress('Verifying build outputs...', 0);
        
        const requiredFiles = [
            '.next/BUILD_ID',
            'dist-mcp/mcp-main.js', 
            'electron/main.js'
        ];
        
        requiredFiles.forEach((file, index) => {
            showProgress(`Checking ${file}...`, (index + 1) * 100 / requiredFiles.length);
            if (!fs.existsSync(file)) {
                errorExit(`Build verification failed: Missing ${file}`);
            }
        });
        
        completeStep('Build verification passed');

        // Step 4: Create Compatibility Directories
        showProgress('Creating compatibility directories...', 0);
        createMockDirs();
        completeStep('Compatibility directories created');

        // Step 5: Package Electron Application
        showProgress('Starting Electron packaging...', 0);
        
        try {
            runCommand('npx electron-builder --win --x64');
            completeStep('Packaging complete');
        } catch (error) {
            cleanupMockDirs();
            throw error;
        }

        // Cleanup
        console.log('Cleaning up temporary directories...');
        cleanupMockDirs();
        console.log('✓ Cleanup complete.\n');

        // Success Message
        console.log('+------------------------------------------+');
        console.log('|       BUILD COMPLETED SUCCESSFULLY!      |');
        console.log('|                                          |');
        console.log('|   Your app is ready in: dist-electron    |');
        console.log('|   Look for: Jarvis 2.0 Setup.exe       |');
        console.log('+------------------------------------------+');

        // Post-Build Verification
        console.log('\nVerifying packaged application...');
        
        const outputFiles = [
            'dist-electron/win-unpacked/jarvis-local.exe',
            'dist-electron/jarvis-local Setup 2.0.0.exe'
        ];
        
        outputFiles.forEach(file => {
            if (fs.existsSync(file)) {
                const stats = fs.statSync(file);
                const sizeMB = Math.round(stats.size / 1024 / 1024);
                console.log(`✓ ${path.basename(file)} (${sizeMB} MB)`);
            } else {
                console.log(`⚠ ${path.basename(file)} - Not found`);
            }
        });

        console.log('\nNext steps:');
        console.log('1. Test the executable: dist-electron/win-unpacked/jarvis-local.exe');
        console.log('2. If you see a black screen, check the troubleshooting guide');
        console.log('3. Distribute the installer: Jarvis 2.0 Setup.exe');

        // Open build folder (Windows only)
        if (process.platform === 'win32' && fs.existsSync('dist-electron')) {
            console.log('\nOpening build folder...');
            execSync('start "" "dist-electron"', { stdio: 'ignore' });
        }

    } catch (error) {
        cleanupMockDirs();
        errorExit(error.message);
    }
}

// Run the build
main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
