// Debug script for packaged Electron app
// Run this in the packaged app directory to diagnose issues

const fs = require('fs');
const path = require('path');

console.log('=== JARVIS 2.0 PACKAGED APP DIAGNOSTICS ===\n');

// Check if we're in the right directory
const currentDir = process.cwd();
console.log('Current directory:', currentDir);

// Check for key files
const keyFiles = [
  'package.json',
  '.next/BUILD_ID',
  'dist-mcp/mcp-main.js',
  'electron/main.js',
  'electron/preload.js'
];

console.log('\n--- File Existence Check ---');
keyFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
  
  if (exists && file === 'package.json') {
    try {
      const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
      console.log(`   Version: ${pkg.version}`);
      console.log(`   Main: ${pkg.main}`);
    } catch (e) {
      console.log(`   Error reading package.json: ${e.message}`);
    }
  }
});

// Check Next.js build
console.log('\n--- Next.js Build Check ---');
if (fs.existsSync('.next')) {
  console.log('✅ .next directory exists');
  
  if (fs.existsSync('.next/BUILD_ID')) {
    const buildId = fs.readFileSync('.next/BUILD_ID', 'utf8').trim();
    console.log(`   Build ID: ${buildId}`);
  }
  
  if (fs.existsSync('.next/server/pages-manifest.json')) {
    console.log('✅ Pages manifest exists');
  } else {
    console.log('❌ Pages manifest missing');
  }
} else {
  console.log('❌ .next directory missing - Next.js not built');
}

// Check MCP build
console.log('\n--- MCP Server Check ---');
if (fs.existsSync('dist-mcp')) {
  console.log('✅ dist-mcp directory exists');
  
  const mcpFiles = fs.readdirSync('dist-mcp');
  console.log(`   Files: ${mcpFiles.join(', ')}`);
} else {
  console.log('❌ dist-mcp directory missing - MCP server not built');
}

// Check node_modules
console.log('\n--- Dependencies Check ---');
if (fs.existsSync('node_modules')) {
  console.log('✅ node_modules exists');
  
  const criticalDeps = ['next', 'electron', 'express'];
  criticalDeps.forEach(dep => {
    const depPath = path.join('node_modules', dep);
    const exists = fs.existsSync(depPath);
    console.log(`   ${exists ? '✅' : '❌'} ${dep}`);
  });
} else {
  console.log('❌ node_modules missing');
}

// Environment check
console.log('\n--- Environment Check ---');
console.log(`Node.js version: ${process.version}`);
console.log(`Platform: ${process.platform}`);
console.log(`Architecture: ${process.arch}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);

// Port availability check
console.log('\n--- Port Availability Check ---');
const net = require('net');

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
}

Promise.all([
  checkPort(3000),
  checkPort(8080)
]).then(([nextPortFree, mcpPortFree]) => {
  console.log(`Port 3000 (Next.js): ${nextPortFree ? 'Available' : 'In use'}`);
  console.log(`Port 8080 (MCP): ${mcpPortFree ? 'Available' : 'In use'}`);
  
  console.log('\n=== DIAGNOSTICS COMPLETE ===');
  console.log('\nIf you see any ❌ marks above, those are likely the cause of the black screen.');
  console.log('Make sure to run "npm run build" before packaging the app.');
});
