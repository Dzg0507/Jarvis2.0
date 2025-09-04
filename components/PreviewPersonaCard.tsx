'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Persona } from '@/lib/personas';
import { Save, RefreshCw, Eye, Info } from 'lucide-react';

interface PreviewPersonaCardProps {
  persona: Persona;
  isSelected: boolean;
  onClick: () => void;
  onSave: () => Promise<boolean>;
  onRegenerate: () => void;
  onExpand?: () => void;
}

export default function PreviewPersonaCard({
  persona,
  isSelected,
  onClick,
  onSave,
  onRegenerate,
  onExpand
}: PreviewPersonaCardProps) {
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setSaving(true);
      await onSave();
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRegenerate();
  };

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onExpand) {
      onExpand();
    }
  };

  return (
    <div
      className={`persona-card p-4 rounded-lg border-2 cursor-pointer transition-all relative ${
        isSelected
          ? 'border-cyan-400 bg-cyan-900/20 selected shadow-lg shadow-cyan-400/20'
          : 'border-cyan-400/50 hover:border-cyan-400/70 bg-black/50'
      }`}
      onClick={onClick}
      style={{
        borderLeftColor: isSelected ? '#00ffff' : '#00ffff80',
        borderLeftWidth: '4px',
        borderStyle: 'dashed' // Dashed border to indicate preview
      }}
    >
      {/* Preview Badge and Actions */}
      <div className="absolute top-2 right-2 flex items-center space-x-1">
        {onExpand && (
          <Button
            onClick={handleExpand}
            size="sm"
            variant="ghost"
            className="w-6 h-6 p-0 bg-cyan-500/20 text-cyan-400 rounded-full text-xs hover:bg-cyan-500/30 transition-colors border border-cyan-400/40"
            title="View details"
          >
            <Info className="w-3 h-3" />
          </Button>
        )}
        <div className="flex items-center bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-full text-xs font-mono border border-cyan-400/30">
          <Eye className="w-3 h-3 mr-1" />
          PREVIEW
        </div>
      </div>

      <div className="flex items-center justify-between mb-2 pr-20">
        <h3 className="font-medium text-cyan-400 truncate pr-2 font-orbitron">{persona.name}</h3>
        <div
          className="w-4 h-4 rounded-full flex-shrink-0 shadow-lg animate-pulse"
          style={{ 
            backgroundColor: persona.color, 
            boxShadow: `0 0 12px ${persona.color}` 
          }}
        ></div>
      </div>

      <p className="text-sm text-cyan-400/80 mb-3 line-clamp-2">{persona.description}</p>
      
      <div className="flex flex-wrap gap-1 mb-3">
        {persona.personalityTraits.slice(0, 3).map((trait) => (
          <span
            key={trait}
            className="px-2 py-1 text-xs bg-cyan-400/20 text-cyan-400 border border-cyan-400/30 rounded truncate"
          >
            {trait}
          </span>
        ))}
        {persona.personalityTraits.length > 3 && (
          <span className="px-2 py-1 text-xs bg-cyan-400/10 text-cyan-400/70 border border-cyan-400/20 rounded">
            +{persona.personalityTraits.length - 3}
          </span>
        )}
      </div>

      <div className="text-xs text-cyan-400/70 capitalize font-mono mb-3">
        {persona.communicationStyle} style
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2 mt-3 pt-3 border-t border-cyan-400/20">
        <Button
          onClick={handleSave}
          disabled={saving}
          size="sm"
          className="flex-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-400/30 hover:border-green-400/50 transition-all"
        >
          {saving ? (
            <>
              <div className="w-3 h-3 border border-green-400 border-t-transparent rounded-full animate-spin mr-1" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-3 h-3 mr-1" />
              Save
            </>
          )}
        </Button>
        
        <Button
          onClick={handleRegenerate}
          size="sm"
          className="flex-1 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border border-orange-400/30 hover:border-orange-400/50 transition-all"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          New
        </Button>
      </div>

      {/* Animated glow effect for preview */}
      <div className="absolute inset-0 rounded-lg pointer-events-none overflow-hidden">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-cyan-400/5 via-transparent to-cyan-400/5 animate-pulse"></div>
        {/* Animated border shimmer */}
        <div className="absolute inset-0 rounded-lg">
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent animate-shimmer"></div>
        </div>
      </div>
    </div>
  );
}
