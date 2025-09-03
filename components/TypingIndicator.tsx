'use client';

import React from 'react';

interface TypingIndicatorProps {
  personaName?: string;
  personaColor?: string;
}

export default function TypingIndicator({ 
  personaName = 'AI', 
  personaColor = '#6B7280' 
}: TypingIndicatorProps) {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-gray-200 text-gray-800 max-w-xs lg:max-w-md px-4 py-3 rounded-lg">
        <div className="flex items-center space-x-2">
          <div 
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: personaColor }}
          ></div>
          <span className="text-sm text-gray-600">{personaName} is typing</span>
          <div className="typing-indicator">
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
          </div>
        </div>
      </div>
    </div>
  );
}