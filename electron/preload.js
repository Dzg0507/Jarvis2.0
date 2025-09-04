const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  isWindowMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  
  // Splash screen
  splashComplete: () => ipcRenderer.invoke('splash-complete'),
  
  // System info
  platform: process.platform,
  
  // Event listeners
  onMainProcessMessage: (callback) => {
    ipcRenderer.on('main-process-message', callback);
  },
  
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Expose a limited API for desktop-specific features
contextBridge.exposeInMainWorld('desktopAPI', {
  isDesktop: true,
  platform: process.platform,
  
  // Desktop-specific utilities
  openExternal: (url) => {
    // This would need to be implemented in main process
    ipcRenderer.invoke('open-external', url);
  },
  
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Theme and appearance
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  
  // Notifications (if needed)
  showNotification: (title, body) => {
    ipcRenderer.invoke('show-notification', { title, body });
  }
});

console.log('Preload script loaded');
console.log('Context bridge established');
