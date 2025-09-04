'use client';

import React from 'react';

interface TypingIndicatorProps {
  personaName?: string;
  personaColor?: string;
}

export default function TypingIndicator({
  personaName = 'AI',
  personaColor = '#00ff41'
}: TypingIndicatorProps) {
  return (
    <div className="flex justify-start mb-6 animate-message-enter">
      <div className="max-w-xs lg:max-w-md">
        <div className="flex items-center mb-2">
          <div className="w-3 h-3 rounded-full mr-2 animate-pulse shadow-lg"
               style={{
                 backgroundColor: personaColor || 'var(--chimera-matrix-green)',
                 boxShadow: `0 0 8px ${personaColor || 'var(--chimera-matrix-green)'}`
               }}>
          </div>
          <span className="text-xs font-orbitron font-medium text-chimera-matrix">{personaName}</span>
        </div>
        <div className="floating-card p-4">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-3 h-1 rounded-full animate-audio-bars"
                   style={{
                     backgroundColor: personaColor || 'var(--chimera-matrix-green)',
                     animationDelay: '0s'
                   }}>
              </div>
              <div className="w-3 h-1 rounded-full animate-audio-bars"
                   style={{
                     backgroundColor: personaColor || 'var(--chimera-matrix-green)',
                     animationDelay: '0.2s'
                   }}>
              </div>
              <div className="w-3 h-1 rounded-full animate-audio-bars"
                   style={{
                     backgroundColor: personaColor || 'var(--chimera-matrix-green)',
                     animationDelay: '0.4s'
                   }}>
              </div>
              <div className="w-3 h-1 rounded-full animate-audio-bars"
                   style={{
                     backgroundColor: personaColor || 'var(--chimera-matrix-green)',
                     animationDelay: '0.6s'
                   }}>
              </div>
            </div>
            <span className="text-xs text-chimera-secondary ml-3 animate-ai-typing font-inter">thinking...</span>
          </div>
        </div>
      </div>
    </div>
  );
}