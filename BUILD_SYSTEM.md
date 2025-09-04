# Jarvis 2.0 - Build System Guide

## Overview

This document describes the comprehensive build system for Jarvis 2.0, including solutions for the TypeScript compilation error and multiple build approaches.

## Build Options

### 1. **npm run dist** (Recommended - Simple)
```bash
npm run dist
```
- Uses the enhanced npm scripts
- Includes automatic cleaning and verification
- Cross-platform compatible
- Maintains mock directory workaround

### 2. **Enhanced Batch Script** (Windows)
```cmd
build.bat
```
- Visual progress bars with percentage
- 5-step build process with verification
- Automatic cleanup and error handling
- Post-build diagnostics

### 3. **Enhanced PowerShell Script** (Windows)
```powershell
./build.ps1
```
- Advanced progress tracking with timing
- Comprehensive error handling
- Build verification and diagnostics
- Automatic folder opening

### 4. **Simple Node.js Script** (Cross-platform)
```bash
npm run build:simple
```
- Pure Node.js implementation
- Progress tracking and error handling
- Works on all platforms
- No shell dependencies

## TypeScript Compilation Fix

### Problem
```
BUILD FAILED: Specified argument was out of the range of valid values.
Parameter name: times
```

### Solution Applied
Updated `tsconfig.mcp.json` with:
- `"noEmitOnError": false` - Prevents build failures on minor errors
- `"declaration": false` - Speeds up compilation
- `"sourceMap": false` - Reduces output size
- `"removeComments": true` - Cleans output
- `"incremental": false` - Prevents cache issues

### Build Script Enhancement
Updated `package.json` scripts:
- `"build:mcp": "tsc --project tsconfig.mcp.json --incremental false"`
- Added `rimraf` for cross-platform cleaning
- Added build verification step

## Build Process (5 Steps)

### Step 1: Clean Previous Builds
- Removes `.next`, `dist-electron`, `dist-mcp` directories
- Ensures fresh build environment

### Step 2: Build Applications
- Runs `next build` for the frontend
- Runs `tsc` for the MCP server
- Includes error handling and verification
- Validates Python dependencies for Stable Diffusion

### Step 3: Verify Build Outputs
- Checks for `.next/BUILD_ID`
- Verifies `dist-mcp/mcp-main.js` exists
- Confirms `electron/main.js` is present
- Validates `src/services/stable-diffusion-server.py` exists

### Step 4: Create Compatibility Directories
- Creates mock directories for electron-builder
- Prevents scan errors during packaging
- Automatically cleaned up after build

### Step 5: Package Electron Application
- Runs `electron-builder --win --x64`
- Creates executable and installer
- Includes progress tracking
- Packages Python server for Stable Diffusion

## Troubleshooting

### Diagnostic Script
```bash
npm run build:fix
```
This script:
- Checks TypeScript configuration
- Verifies Node.js and npm versions
- Tests Python installation and dependencies for Stable Diffusion
- Tests Node.js dependencies
- Attempts automatic fixes
- Provides detailed error reporting

### Common Issues and Solutions

#### 1. TypeScript Compilation Error
**Error**: `Specified argument was out of the range of valid values`
**Solution**: 
- Run `npm run build:fix`
- Clear TypeScript cache: `rm tsconfig.tsbuildinfo`
- Use `--incremental false` flag

#### 2. Missing Dependencies
**Error**: Module not found errors
**Solution**:
- Run `npm install`
- Check `npm run build:fix` output
- Verify Node.js version (18+ recommended)

#### 3. Build Verification Failed
**Error**: Missing build output files
**Solution**:
- Check source files exist
- Verify TypeScript compilation
- Run diagnostic script

#### 4. Electron Packaging Failed
**Error**: electron-builder errors
**Solution**:
- Ensure all build outputs exist
- Check mock directories are created
- Verify package.json configuration

## Server Embedding Fix

The build system maintains the server embedding approach to fix the black screen issue:

### Changes Made:
1. **electron/main.js**: Embedded Next.js and MCP servers
2. **next.config.js**: Removed static export configuration
3. **package.json**: Updated file inclusion patterns

### How It Works:
1. In production, Electron starts embedded servers
2. Next.js server runs on port 3000
3. MCP server runs on port 8080
4. Windows load from `http://localhost:3000`

## Build Commands Reference

| Command | Description | Platform |
|---------|-------------|----------|
| `npm run dist` | Full build and package | All |
| `npm run build` | Build only (no package) | All |
| `npm run build:simple` | Node.js build script | All |
| `npm run build:fix` | Diagnostic and fix | All |
| `./build.bat` | Enhanced batch script | Windows |
| `./build.ps1` | Enhanced PowerShell script | Windows |
| `npm run clean` | Clean build directories | All |
| `npm run verify-build` | Verify build outputs | All |

## File Structure

```
├── build.bat              # Enhanced Windows batch script
├── build.ps1              # Enhanced PowerShell script  
├── simple-build.js        # Cross-platform Node.js script
├── fix-build-issues.js    # Diagnostic and fix script
├── tsconfig.mcp.json      # Fixed TypeScript config
├── package.json           # Enhanced npm scripts
└── BUILD_SYSTEM.md        # This documentation
```

## Best Practices

1. **Always run diagnostics first**: `npm run build:fix`
2. **Use npm scripts for consistency**: `npm run dist`
3. **Test the packaged app** before distribution
4. **Check build verification** passes
5. **Keep dependencies updated**

## Performance Tips

- Use `npm run dist` for fastest builds
- Clear caches if issues persist: `npm run clean`
- Use Node.js 18+ for best performance
- Consider using `--parallel` flag for electron-builder

## Support

If you encounter issues:
1. Run the diagnostic script: `npm run build:fix`
2. Check this documentation
3. Review the TROUBLESHOOTING.md file
4. Check console output for specific errors
