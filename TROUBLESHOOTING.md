# Jarvis 2.0 - Black Screen Troubleshooting Guide

## Problem Summary
The packaged Electron executable shows a black screen instead of the application interface.

## Root Cause Analysis
The issue was caused by a mismatch between the Electron configuration and the Next.js build output:

1. **Missing Static Export**: Electron was configured to load static files from an `out` directory, but Next.js was not configured to generate static exports.
2. **Server Dependencies**: The app has extensive server-side functionality (API routes, MCP server) that cannot work with static exports.
3. **Path Resolution**: Incorrect file paths in the packaged environment.

## Solution Implemented
**Hybrid Approach - Embedded Server**: Run Next.js and MCP servers within the Electron process.

### Changes Made:

#### 1. Updated `electron/main.js`:
- Added server startup functions for Next.js and MCP
- Modified window loading to use embedded servers
- Added proper cleanup on app quit
- Improved error handling and logging

#### 2. Updated `next.config.js`:
- Removed static export configuration
- Kept server-side functionality intact

#### 3. Updated `package.json`:
- Improved file inclusion/exclusion patterns
- Ensured all necessary files are packaged

## Testing Steps

### 1. Clean Build
```bash
# Clean previous builds
rm -rf .next dist-electron dist-mcp

# Install dependencies
npm install

# Build the application
npm run build

# Package the application
./build.ps1
```

### 2. Debug Packaged App
```bash
# Navigate to the packaged app directory
cd "dist-electron/win-unpacked"

# Run diagnostics
node ../../debug-packaged-app.js
```

### 3. Manual Testing
1. Run the packaged executable: `jarvis-local.exe`
2. Check for splash screen (should appear for 5 seconds)
3. Verify main application loads
4. Test basic functionality

## Common Issues and Solutions

### Issue 1: "Next.js server startup timeout"
**Cause**: Next.js server failed to start within 30 seconds
**Solution**: 
- Check if port 3000 is available
- Verify `.next` directory exists and is complete
- Check console logs for specific errors

### Issue 2: "MCP server startup timeout"
**Cause**: MCP server failed to start within 15 seconds
**Solution**:
- Check if port 8080 is available
- Verify `dist-mcp` directory exists
- Ensure all MCP dependencies are included

### Issue 3: Still showing black screen
**Cause**: Servers started but window failed to load
**Solution**:
- Open DevTools in the packaged app (F12)
- Check console for JavaScript errors
- Verify network requests are successful
- Check if authentication is blocking access

### Issue 4: "Module not found" errors
**Cause**: Missing dependencies in packaged app
**Solution**:
- Update `package.json` files array to include missing modules
- Rebuild and repackage

## Development vs Production Differences

| Aspect | Development | Production (Packaged) |
|--------|-------------|----------------------|
| Next.js Server | External (npm run dev) | Embedded in Electron |
| MCP Server | External (npm run dev:mcp) | Embedded in Electron |
| File Loading | HTTP (localhost:3000) | HTTP (localhost:3000) |
| Hot Reload | Enabled | Disabled |
| DevTools | Auto-open | Manual (F12) |

## Debugging Commands

```bash
# Check if servers are running
netstat -an | findstr :3000
netstat -an | findstr :8080

# View Electron logs (in packaged app)
# Add this to main.js for more verbose logging:
console.log('Electron main process started');

# Test Next.js server manually
curl http://localhost:3000

# Test MCP server manually  
curl http://localhost:8080/health
```

## Prevention

To prevent this issue in the future:
1. Always test the packaged app before distribution
2. Run the diagnostic script after packaging
3. Keep development and production configurations in sync
4. Monitor server startup logs during packaging

## Additional Resources

- Electron Documentation: https://www.electronjs.org/docs
- Next.js Deployment: https://nextjs.org/docs/deployment
- Debugging Electron Apps: https://www.electronjs.org/docs/tutorial/debugging-main-process
