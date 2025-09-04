const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let splashWindow;
let nextServer;
let mcpServer;
let stableDiffusionServer;
const NEXT_PORT = 3000;
const MCP_PORT = 8080;
const SD_PORT = 5001;

// Enable live reload for Electron in development
if (isDev) {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit'
  });
}

// Function to start Next.js server in production
function startNextServer() {
  return new Promise((resolve, reject) => {
    if (isDev) {
      // In development, assume server is already running
      resolve();
      return;
    }

    console.log('Starting Next.js server...');
    const nextPath = path.join(app.getAppPath(), 'node_modules', '.bin', 'next');

    nextServer = spawn('node', [nextPath, 'start', '-p', NEXT_PORT.toString()], {
      cwd: app.getAppPath(),
      stdio: ['ignore', 'pipe', 'pipe']
    });

    nextServer.stdout.on('data', (data) => {
      console.log(`Next.js: ${data}`);
      if (data.toString().includes('Ready on')) {
        resolve();
      }
    });

    nextServer.stderr.on('data', (data) => {
      console.error(`Next.js Error: ${data}`);
    });

    nextServer.on('error', (error) => {
      console.error('Failed to start Next.js server:', error);
      reject(error);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      reject(new Error('Next.js server startup timeout'));
    }, 30000);
  });
}

// Function to start MCP server in production
function startMcpServer() {
  return new Promise((resolve, reject) => {
    if (isDev) {
      // In development, assume server is already running
      resolve();
      return;
    }

    console.log('Starting MCP server...');
    const mcpPath = path.join(app.getAppPath(), 'dist-mcp', 'mcp-main.js');

    mcpServer = spawn('node', [mcpPath], {
      cwd: app.getAppPath(),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, MCP_PORT: MCP_PORT.toString() }
    });

    mcpServer.stdout.on('data', (data) => {
      console.log(`MCP: ${data}`);
      if (data.toString().includes('Server running on port')) {
        resolve();
      }
    });

    mcpServer.stderr.on('data', (data) => {
      console.error(`MCP Error: ${data}`);
    });

    mcpServer.on('error', (error) => {
      console.error('Failed to start MCP server:', error);
      reject(error);
    });

    // Timeout after 15 seconds
    setTimeout(() => {
      reject(new Error('MCP server startup timeout'));
    }, 15000);
  });
}

// Function to start Stable Diffusion server in production
function startStableDiffusionServer() {
  return new Promise((resolve, reject) => {
    if (isDev) {
      // In development, assume server is already running or will be started manually
      resolve();
      return;
    }

    // Check if Python is available
    try {
      const pythonCheck = spawn('python', ['--version'], { stdio: 'pipe' });
      pythonCheck.on('error', () => {
        console.log('Python not found, trying python3...');
        tryPython3();
      });
      pythonCheck.on('close', (code) => {
        if (code === 0) {
          startWithPython('python');
        } else {
          tryPython3();
        }
      });
    } catch (error) {
      tryPython3();
    }

    function tryPython3() {
      try {
        const python3Check = spawn('python3', ['--version'], { stdio: 'pipe' });
        python3Check.on('error', () => {
          console.log('Stable Diffusion server disabled: Python not found');
          resolve(); // Don't fail the entire app if Python is not available
        });
        python3Check.on('close', (code) => {
          if (code === 0) {
            startWithPython('python3');
          } else {
            console.log('Stable Diffusion server disabled: Python not available');
            resolve();
          }
        });
      } catch (error) {
        console.log('Stable Diffusion server disabled: Python not available');
        resolve();
      }
    }

    function startWithPython(pythonCmd) {
      console.log('Starting Stable Diffusion server...');
      const sdPath = path.join(app.getAppPath(), 'src', 'services', 'stable-diffusion-server.py');

      stableDiffusionServer = spawn(pythonCmd, [sdPath], {
        cwd: app.getAppPath(),
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          SD_PORT: SD_PORT.toString(),
          SD_PRELOAD: 'false' // Don't preload model to speed up startup
        }
      });

      stableDiffusionServer.stdout.on('data', (data) => {
        console.log(`SD: ${data}`);
        if (data.toString().includes('Starting Stable Diffusion server')) {
          // Give it a moment to fully start
          setTimeout(() => resolve(), 2000);
        }
      });

      stableDiffusionServer.stderr.on('data', (data) => {
        console.error(`SD Error: ${data}`);
        // Don't reject on stderr as some libraries output info there
      });

      stableDiffusionServer.on('error', (error) => {
        console.error('Failed to start Stable Diffusion server:', error);
        console.log('Stable Diffusion will be disabled');
        resolve(); // Don't fail the entire app
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        console.log('Stable Diffusion server startup timeout - continuing without it');
        resolve();
      }, 30000);
    }
  });
}

function createSplashWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  splashWindow = new BrowserWindow({
    width: 800,
    height: 600,
    x: Math.round((width - 800) / 2),
    y: Math.round((height - 600) / 2),
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load splash screen
  if (isDev) {
    splashWindow.loadURL('http://localhost:3000/splash');
  } else {
    // Load from the embedded Next.js server
    splashWindow.loadURL(`http://localhost:${NEXT_PORT}/splash`);
  }

  // Remove menu bar
  splashWindow.setMenuBarVisibility(false);

  // Auto-hide splash after 5 seconds and show main window
  setTimeout(() => {
    if (splashWindow) {
      splashWindow.close();
      splashWindow = null;
      showMainWindow();
    }
  }, 5000);

  if (isDev) {
    splashWindow.webContents.openDevTools();
  }
}

function createMainWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  mainWindow = new BrowserWindow({
    width: Math.round(width * 0.9),
    height: Math.round(height * 0.9),
    minWidth: 1200,
    minHeight: 800,
    frame: false,
    show: false, // Don't show until splash is done
    transparent: false,
    backgroundColor: '#0a0a0a',
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      // THIS IS THE FIX: Disable web security to allow loading local files
      webSecurity: false 
    }
  });

  // Load the Next.js app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    // Load from the embedded Next.js server
    mainWindow.loadURL(`http://localhost:${NEXT_PORT}`);
  }

  // Remove menu bar
  mainWindow.setMenuBarVisibility(false);

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window controls
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('main-process-message', 'Window loaded');
  });
}

function showMainWindow() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
}

// App event handlers
app.whenReady().then(async () => {
  try {
    // Start servers in production
    if (!isDev) {
      console.log('Starting servers...');
      await Promise.all([
        startNextServer(),
        startMcpServer(),
        startStableDiffusionServer() // Optional - won't fail if Python unavailable
      ]);
      console.log('All servers started successfully');
    }

    createMainWindow();
    createSplashWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  } catch (error) {
    console.error('Failed to start application:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Clean up servers before quitting
    if (nextServer) {
      nextServer.kill();
    }
    if (mcpServer) {
      mcpServer.kill();
    }
    if (stableDiffusionServer) {
      stableDiffusionServer.kill();
    }
    app.quit();
  }
});

// Handle app quit
app.on('before-quit', () => {
  console.log('Shutting down servers...');
  if (nextServer) {
    nextServer.kill();
  }
  if (mcpServer) {
    mcpServer.kill();
  }
  if (stableDiffusionServer) {
    stableDiffusionServer.kill();
  }
});

// IPC handlers for window controls
ipcMain.handle('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// Handle splash screen completion
ipcMain.handle('splash-complete', () => {
  if (splashWindow) {
    splashWindow.close();
    splashWindow = null;
    showMainWindow();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (navigationEvent, navigationURL) => {
    event.preventDefault();
  });
});

// Handle certificate errors in development
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (isDev) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

// Prevent navigation to external URLs
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (navigationEvent, navigationURL) => {
    const parsedUrl = new URL(navigationURL);
    
    if (parsedUrl.origin !== 'http://localhost:3000' && !isDev) {
      navigationEvent.preventDefault();
    }
  });
});

console.log('Electron main process started');
console.log('Development mode:', isDev);
console.log('App version:', app.getVersion());