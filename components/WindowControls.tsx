'use client';

import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Maximize2, Minimize2 } from 'lucide-react';

export default function WindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Check if running in Electron
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      setIsDesktop(true);
      
      // Check initial maximized state
      (window as any).electronAPI.isWindowMaximized().then((maximized: boolean) => {
        setIsMaximized(maximized);
      });
    }
  }, []);

  const handleMinimize = () => {
    if ((window as any).electronAPI) {
      (window as any).electronAPI.minimizeWindow();
    }
  };

  const handleMaximize = () => {
    if ((window as any).electronAPI) {
      (window as any).electronAPI.maximizeWindow();
      setIsMaximized(!isMaximized);
    }
  };

  const handleClose = () => {
    if ((window as any).electronAPI) {
      (window as any).electronAPI.closeWindow();
    }
  };

  // Don't render if not in desktop mode
  if (!isDesktop) {
    return null;
  }

  return (
    <div className="flex items-center space-x-1 ml-auto">
      {/* Minimize Button */}
      <button
        onClick={handleMinimize}
        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-chimera-matrix-green/20 transition-colors duration-200 group"
        title="Minimize"
      >
        <Minus className="w-4 h-4 text-chimera-secondary group-hover:text-chimera-matrix transition-colors duration-200" />
      </button>

      {/* Maximize/Restore Button */}
      <button
        onClick={handleMaximize}
        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-chimera-cyan/20 transition-colors duration-200 group"
        title={isMaximized ? "Restore" : "Maximize"}
      >
        {isMaximized ? (
          <Minimize2 className="w-4 h-4 text-chimera-secondary group-hover:text-chimera-cyan transition-colors duration-200" />
        ) : (
          <Maximize2 className="w-4 h-4 text-chimera-secondary group-hover:text-chimera-cyan transition-colors duration-200" />
        )}
      </button>

      {/* Close Button */}
      <button
        onClick={handleClose}
        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-chimera-hot-magenta/20 transition-colors duration-200 group"
        title="Close"
      >
        <X className="w-4 h-4 text-chimera-secondary group-hover:text-chimera-hot-magenta transition-colors duration-200" />
      </button>
    </div>
  );
}
