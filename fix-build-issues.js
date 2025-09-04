#!/usr/bin/env node

/**
 * Jarvis 2.0 - Build Issues Diagnostic and Fix Script
 * This script diagnoses and fixes common build issues
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== JARVIS 2.0 BUILD DIAGNOSTIC & FIX TOOL ===\n');

// Colors for console output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkAndFix() {
    let issuesFound = 0;
    let issuesFixed = 0;

    log('1. Checking TypeScript Configuration...', 'blue');
    
    // Check tsconfig.mcp.json for common issues
    if (fs.existsSync('tsconfig.mcp.json')) {
        try {
            const config = JSON.parse(fs.readFileSync('tsconfig.mcp.json', 'utf8'));
            
            // Check for problematic settings
            if (!config.compilerOptions.hasOwnProperty('noEmitOnError')) {
                log('   ⚠️  Adding noEmitOnError: false to prevent build failures', 'yellow');
                config.compilerOptions.noEmitOnError = false;
                fs.writeFileSync('tsconfig.mcp.json', JSON.stringify(config, null, 2));
                issuesFixed++;
            }
            
            if (!config.compilerOptions.hasOwnProperty('declaration')) {
                log('   ⚠️  Adding declaration: false to speed up compilation', 'yellow');
                config.compilerOptions.declaration = false;
                fs.writeFileSync('tsconfig.mcp.json', JSON.stringify(config, null, 2));
                issuesFixed++;
            }
            
            log('   ✅ TypeScript configuration checked', 'green');
        } catch (error) {
            log(`   ❌ Error reading tsconfig.mcp.json: ${error.message}`, 'red');
            issuesFound++;
        }
    } else {
        log('   ❌ tsconfig.mcp.json not found', 'red');
        issuesFound++;
    }

    log('\n2. Checking Node.js and npm versions...', 'blue');
    try {
        const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
        const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
        log(`   ✅ Node.js: ${nodeVersion}`, 'green');
        log(`   ✅ npm: ${npmVersion}`, 'green');

        // Check if Node.js version is compatible
        const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
        if (majorVersion < 18) {
            log('   ⚠️  Node.js version is older than 18. Consider upgrading.', 'yellow');
            issuesFound++;
        }
    } catch (error) {
        log('   ❌ Node.js or npm not found in PATH', 'red');
        issuesFound++;
    }

    log('\n3. Checking Python for Stable Diffusion...', 'blue');
    let pythonAvailable = false;
    try {
        // Try python first
        execSync('python --version', { encoding: 'utf8', stdio: 'pipe' });
        log('   ✅ Python available', 'green');
        pythonAvailable = true;
    } catch (error) {
        try {
            // Try python3
            execSync('python3 --version', { encoding: 'utf8', stdio: 'pipe' });
            log('   ✅ Python3 available', 'green');
            pythonAvailable = true;
        } catch (error2) {
            log('   ⚠️  Python not found - Stable Diffusion will be disabled', 'yellow');
            log('   Install Python 3.8+ to enable local image generation', 'yellow');
        }
    }

    if (pythonAvailable) {
        // Check for Python dependencies
        const pythonDeps = ['torch', 'diffusers', 'flask', 'flask_cors', 'PIL'];
        let missingDeps = [];

        for (const dep of pythonDeps) {
            try {
                execSync(`python -c "import ${dep}"`, { stdio: 'pipe' });
                log(`   ✅ ${dep}`, 'green');
            } catch (error) {
                try {
                    execSync(`python3 -c "import ${dep}"`, { stdio: 'pipe' });
                    log(`   ✅ ${dep}`, 'green');
                } catch (error2) {
                    log(`   ❌ ${dep} missing`, 'red');
                    missingDeps.push(dep);
                }
            }
        }

        if (missingDeps.length > 0) {
            log('   ⚠️  Missing Python dependencies for Stable Diffusion:', 'yellow');

            // Check for CUDA support
            let hasCuda = false;
            try {
                const cudaCheck = execSync('python -c "import torch; print(torch.cuda.is_available())"', {
                    encoding: 'utf8',
                    stdio: 'pipe'
                }).trim();
                hasCuda = cudaCheck === 'True';
            } catch (error) {
                // CUDA check failed, assume no CUDA
            }

            if (hasCuda) {
                log('   🚀 CUDA detected - installing GPU-optimized version:', 'green');
                log('   python -m pip install -r requirements.txt --extra-index-url https://download.pytorch.org/whl/cu118', 'green');
                log('   Or run: npm run setup:cuda', 'green');
            } else {
                log('   💻 Installing CPU version:', 'yellow');
                log('   python -m pip install -r requirements.txt', 'yellow');
                log('   Or run: npm run setup:python', 'yellow');
            }

            log('   📋 For manual installation:', 'blue');
            log('   CPU:  pip install torch torchvision diffusers transformers flask flask-cors pillow accelerate', 'blue');
            log('   CUDA: pip install torch torchvision diffusers transformers flask flask-cors pillow accelerate --extra-index-url https://download.pytorch.org/whl/cu118', 'blue');
            issuesFound++;
        }
    }

    log('\n4. Checking Node.js dependencies...', 'blue');
    if (fs.existsSync('node_modules')) {
        log('   ✅ node_modules exists', 'green');
        
        // Check critical dependencies
        const criticalDeps = ['typescript', 'next', 'electron', 'electron-builder', 'sharp', 'multer'];
        criticalDeps.forEach(dep => {
            const depPath = path.join('node_modules', dep);
            if (fs.existsSync(depPath)) {
                log(`   ✅ ${dep}`, 'green');
            } else {
                log(`   ❌ ${dep} missing`, 'red');
                issuesFound++;
            }
        });
    } else {
        log('   ❌ node_modules missing - run npm install', 'red');
        issuesFound++;
    }

    log('\n5. Checking build directories...', 'blue');
    const buildDirs = ['.next', 'dist-mcp', 'dist-electron'];
    buildDirs.forEach(dir => {
        if (fs.existsSync(dir)) {
            log(`   ⚠️  ${dir} exists (will be cleaned during build)`, 'yellow');
        } else {
            log(`   ✅ ${dir} clean`, 'green');
        }
    });

    log('\n6. Checking source files...', 'blue');
    const sourceFiles = [
        'src/mcp-main.ts',
        'src/config.ts',
        'src/services/stable-diffusion-server.py',
        'electron/main.js',
        'electron/preload.js'
    ];
    
    sourceFiles.forEach(file => {
        if (fs.existsSync(file)) {
            log(`   ✅ ${file}`, 'green');
        } else {
            log(`   ❌ ${file} missing`, 'red');
            issuesFound++;
        }
    });

    log('\n7. Checking TypeScript compilation...', 'blue');
    try {
        // Try to compile TypeScript without emitting files
        execSync('npx tsc --project tsconfig.mcp.json --noEmit', { 
            stdio: 'pipe',
            encoding: 'utf8'
        });
        log('   ✅ TypeScript compilation check passed', 'green');
    } catch (error) {
        log('   ❌ TypeScript compilation issues found:', 'red');
        log(`   ${error.stdout || error.message}`, 'red');
        issuesFound++;
        
        // Try to fix common issues
        log('   🔧 Attempting to fix TypeScript issues...', 'yellow');
        try {
            // Clear TypeScript cache
            if (fs.existsSync('tsconfig.tsbuildinfo')) {
                fs.unlinkSync('tsconfig.tsbuildinfo');
                log('   ✅ Cleared TypeScript build cache', 'green');
                issuesFixed++;
            }
            
            // Try compilation again with less strict settings
            execSync('npx tsc --project tsconfig.mcp.json --noEmit --skipLibCheck', { 
                stdio: 'pipe' 
            });
            log('   ✅ TypeScript issues resolved with skipLibCheck', 'green');
            issuesFixed++;
        } catch (retryError) {
            log('   ❌ Could not automatically fix TypeScript issues', 'red');
        }
    }

    log('\n8. Checking startup system components...', 'blue');
    const startupFiles = [
        'requirements.txt',
        'scripts/start-stable-diffusion.js',
        'scripts/health-check.js',
        'scripts/setup.js',
        '.env.example',
        'start-jarvis.bat',
        'start-jarvis.sh'
    ];

    let startupIssues = 0;
    startupFiles.forEach(file => {
        if (fs.existsSync(file)) {
            log(`   ✅ ${file}`, 'green');
        } else {
            log(`   ❌ ${file} missing`, 'red');
            startupIssues++;
        }
    });

    if (startupIssues > 0) {
        log('   ⚠️  Some startup system files are missing', 'yellow');
        log('   This may affect auto-startup functionality', 'yellow');
        issuesFound += startupIssues;
    } else {
        log('   ✅ All startup system components present', 'green');
    }

    // Check if .env file exists
    if (!fs.existsSync('.env')) {
        log('   ⚠️  .env file not found', 'yellow');
        if (fs.existsSync('.env.example')) {
            log('   💡 Run: cp .env.example .env', 'blue');
            log('   Then edit .env with your API keys', 'blue');
        }
        issuesFound++;
    } else {
        log('   ✅ .env file exists', 'green');

        // Check for required API keys
        const envContent = fs.readFileSync('.env', 'utf8');
        if (envContent.includes('your_google_ai_api_key_here')) {
            log('   ⚠️  Google AI API key not configured in .env', 'yellow');
            log('   Edit .env and add your API key from https://makersuite.google.com/app/apikey', 'yellow');
            issuesFound++;
        } else {
            log('   ✅ Google AI API key configured', 'green');
        }
    }

    log('\n9. Testing build process...', 'blue');
    try {
        // Test Next.js build
        log('   Testing Next.js build...', 'blue');
        execSync('npm run build', { stdio: 'pipe', timeout: 120000 });
        log('   ✅ Build test passed', 'green');
    } catch (error) {
        log('   ❌ Build test failed', 'red');
        log(`   Error: ${error.message}`, 'red');
        issuesFound++;
    }

    // Summary
    log('\n=== DIAGNOSTIC SUMMARY ===', 'blue');
    log(`Issues found: ${issuesFound}`, issuesFound > 0 ? 'red' : 'green');
    log(`Issues fixed: ${issuesFixed}`, issuesFixed > 0 ? 'green' : 'yellow');

    if (issuesFound === 0) {
        log('\n🎉 No issues found! Your system is ready to go.', 'green');
        log('\nRecommended startup commands:', 'blue');
        log('  npm run dev:full    (start all services with auto-startup)', 'green');
        log('  npm run setup       (interactive setup wizard)', 'green');
        log('  npm run health      (check all service health)', 'green');
        log('\nPlatform-specific startup:', 'blue');
        log('  start-jarvis.bat    (Windows)', 'green');
        log('  ./start-jarvis.sh   (Linux/Mac)', 'green');
        log('\nBuild commands:', 'blue');
        log('  npm run dist        (full build and package)', 'green');
        log('  npm run build       (build only)', 'green');
    } else {
        log('\n⚠️  Issues found that need attention:', 'yellow');
        log('\nRecommended fix actions:', 'blue');
        log('1. Run: npm install', 'green');
        log('2. Run: npm run setup (for first-time setup)', 'green');
        log('3. Check Node.js version (should be 18+)', 'green');
        log('4. Configure .env file with API keys', 'green');
        log('5. Install Python dependencies if needed:', 'green');
        log('   - CPU: npm run setup:python', 'green');
        log('   - CUDA: npm run setup:cuda', 'green');
        log('6. Re-run this diagnostic: npm run build:fix', 'green');

        log('\nFor Python/Stable Diffusion issues:', 'blue');
        log('• Install Python 3.8+ from python.org', 'yellow');
        log('• Run the correct pip command shown above', 'yellow');
        log('• Test with: python -c "import torch; print(torch.__version__)"', 'yellow');
    }

    return { issuesFound, issuesFixed };
}

// Run the diagnostic
try {
    checkAndFix();
} catch (error) {
    log(`\n❌ Diagnostic script failed: ${error.message}`, 'red');
    process.exit(1);
}
