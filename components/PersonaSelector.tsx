'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import PersonaCard from '@/components/PersonaCard';
import { usePersonas } from '@/hooks/usePersonas';
import { useToast } from '@/hooks/use-toast';
import { Persona } from '@/lib/personas';

interface PersonaSelectorProps {
  personas: Persona[];
  selectedPersonaId: string;
  onPersonaSelect: (id: string) => void;
  customPersona: string;
  onCustomPersonaChange: (prompt: string) => void;
  showCustom?: boolean;
  compact?: boolean;
}

export default function PersonaSelector({
  personas,
  selectedPersonaId,
  onPersonaSelect,
  customPersona,
  onCustomPersonaChange,
  showCustom = true,
  compact = false
}: PersonaSelectorProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPersonaDescription, setNewPersonaDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const { generatePersona, deletePersona } = usePersonas();
  const { toast } = useToast();

  const handleCreatePersona = async () => {
    if (!newPersonaDescription.trim()) return;

    try {
      setCreating(true);
      const newPersona = await generatePersona(newPersonaDescription);
      
      if (newPersona) {
        onPersonaSelect(newPersona.id);
        setNewPersonaDescription('');
        setShowCreateForm(false);
        toast({
          title: "Persona created!",
          description: `${newPersona.name} is ready to chat.`,
        });
      }
    } catch (error) {
      console.error('Error creating persona:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePersona = async (personaId: string) => {
    const success = await deletePersona(personaId);
    if (success) {
      toast({
        title: "Persona deleted",
        description: "The persona has been removed.",
      });
    }
  };

  const gridCols = compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-glow-cyan font-orbitron">
          {compact ? 'Select Persona' : 'Choose AI Persona'}
        </h3>
        {!compact && (
          <Button
            className="btn-matrix"
            size="sm"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? 'Cancel' : 'Create New'}
          </Button>
        )}
      </div>

      {showCreateForm && (
        <div className="terminal p-4 rounded-lg space-y-3">
          <h4 className="font-medium text-glow-green font-orbitron">Create Custom Persona</h4>
          <Textarea
            value={newPersonaDescription}
            onChange={(e) => setNewPersonaDescription(e.target.value)}
            placeholder="Describe the persona you want to create (e.g., 'A friendly cooking expert who loves Italian cuisine and gives detailed recipes')"
            rows={3}
            className="terminal-input"
          />
          <div className="flex space-x-2">
            <Button
              onClick={handleCreatePersona}
              disabled={!newPersonaDescription.trim() || creating}
              size="sm"
              className="btn-matrix"
            >
              {creating ? <span className="matrix-loading">Creating...</span> : 'Generate Persona'}
            </Button>
            <Button
              onClick={() => setShowCreateForm(false)}
              size="sm"
              className="btn-matrix"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className={`grid ${gridCols} gap-3`}>
        {personas.map((persona) => (
          <PersonaCard
            key={persona.id}
            persona={persona}
            isSelected={selectedPersonaId === persona.id}
            onClick={() => onPersonaSelect(persona.id)}
            onDelete={() => handleDeletePersona(persona.id)}
            showDelete={!compact}
          />
        ))}

        {showCustom && (
          <div
            className={`persona-card p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedPersonaId === 'custom'
                ? 'border-purple-500 bg-purple-50 selected'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onPersonaSelect('custom')}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900">Custom Persona</h3>
              <div className="w-4 h-4 rounded-full bg-purple-500"></div>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Define your own AI personality with a custom prompt
            </p>
            <div className="text-xs text-gray-500">Custom style</div>
          </div>
        )}
      </div>

      {selectedPersonaId === 'custom' && showCustom && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Custom Persona Prompt
          </label>
          <Textarea
            value={customPersona}
            onChange={(e) => onCustomPersonaChange(e.target.value)}
            placeholder="Enter your custom persona prompt here..."
            rows={4}
          />
          <p className="text-xs text-gray-500">
            Define how the AI should behave, its personality, expertise, and communication style.
          </p>
        </div>
      )}
    </div>
  );
}



