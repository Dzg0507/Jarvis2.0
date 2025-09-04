'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Persona } from '@/lib/personas';
import { Info, Trash2 } from 'lucide-react';

interface PersonaCardProps {
  persona: Persona;
  isSelected: boolean;
  onClick: () => void;
  onDelete?: () => void;
  onExpand?: () => void;
  showDelete?: boolean;
}

export default function PersonaCard({
  persona,
  isSelected,
  onClick,
  onDelete,
  onExpand,
  showDelete = false
}: PersonaCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
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
          ? 'border-matrix-green bg-matrix-dark-green/20 selected shadow-lg shadow-matrix-green/20'
          : 'border-matrix-green/30 hover:border-matrix-green/50 bg-black/50'
      }`}
      onClick={onClick}
      style={{
        borderLeftColor: isSelected ? '#00ff00' : undefined,
        borderLeftWidth: isSelected ? '4px' : undefined
      }}
    >
      {/* Action buttons */}
      <div className="absolute top-2 right-2 flex space-x-1">
        {onExpand && (
          <Button
            onClick={handleExpand}
            size="sm"
            variant="ghost"
            className="w-6 h-6 p-0 bg-matrix-green/20 text-matrix-green rounded-full text-xs hover:bg-matrix-green/30 transition-colors border border-matrix-green/40"
            title="View details"
          >
            <Info className="w-3 h-3" />
          </Button>
        )}
        {showDelete && !persona.isDefault && (
          <Button
            onClick={handleDelete}
            size="sm"
            variant="ghost"
            className="w-6 h-6 p-0 bg-red-500/80 text-white rounded-full text-xs hover:bg-red-600 transition-colors border border-red-400"
            title="Delete persona"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-matrix-green truncate pr-2 font-orbitron">{persona.name}</h3>
        <div
          className="w-4 h-4 rounded-full flex-shrink-0 shadow-lg"
          style={{ backgroundColor: persona.color, boxShadow: `0 0 8px ${persona.color}` }}
        ></div>
      </div>

      <p className="text-sm text-matrix-green/80 mb-3 line-clamp-2">{persona.description}</p>
      
      <div className="flex flex-wrap gap-1 mb-2">
        {persona.personalityTraits.slice(0, 3).map((trait) => (
          <span
            key={trait}
            className="px-2 py-1 text-xs bg-matrix-green/20 text-matrix-green border border-matrix-green/30 rounded truncate"
          >
            {trait}
          </span>
        ))}
        {persona.personalityTraits.length > 3 && (
          <span className="px-2 py-1 text-xs bg-matrix-green/10 text-matrix-green/70 border border-matrix-green/20 rounded">
            +{persona.personalityTraits.length - 3}
          </span>
        )}
      </div>

      <div className="text-xs text-matrix-green/70 capitalize font-mono">
        {persona.communicationStyle} style
      </div>
    </div>
  );
}