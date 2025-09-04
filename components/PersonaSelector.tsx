'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import PersonaCard from '@/components/PersonaCard';
import PreviewPersonaCard from '@/components/PreviewPersonaCard';
import PersonaDetailModal from '@/components/PersonaDetailModal';
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
  const [generatingRandom, setGeneratingRandom] = useState(false);
  const [expandedPersona, setExpandedPersona] = useState<Persona | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const {
    generatePersona,
    deletePersona,
    previewPersona,
    generateRandomPreview,
    savePreviewPersona,
    clearPreviewPersona
  } = usePersonas();
  const { toast } = useToast();

  // Wrapper function to handle persona selection and cleanup
  const handlePersonaSelect = (personaId: string) => {
    // If selecting a non-preview persona, clear any existing preview
    if (!personaId.startsWith('preview-') && previewPersona) {
      clearPreviewPersona();
    }
    onPersonaSelect(personaId);
  };

  const handleCreatePersona = async () => {
    if (!newPersonaDescription.trim()) return;

    try {
      setCreating(true);
      const newPersona = await generatePersona(newPersonaDescription);
      
      if (newPersona) {
        handlePersonaSelect(newPersona.id);
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

  const handleGenerateRandomPersona = async () => {
    try {
      setGeneratingRandom(true);
      const randomPersona = generateRandomPreview();

      // Auto-select the preview persona
      handlePersonaSelect(randomPersona.id);

      toast({
        title: "Random persona preview generated!",
        description: `Meet ${randomPersona.name} - Click "Save" to keep this persona or "New" to generate another.`,
      });
    } catch (error) {
      console.error('Error generating random persona:', error);
      toast({
        title: "Generation failed",
        description: "Could not generate random persona. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGeneratingRandom(false);
    }
  };

  const handleSavePreviewPersona = async (): Promise<boolean> => {
    const success = await savePreviewPersona();
    if (success && previewPersona) {
      // Switch to the saved persona (remove preview prefix)
      const savedId = previewPersona.id.replace('preview-', '');
      handlePersonaSelect(savedId);

      toast({
        title: "Persona saved!",
        description: `${previewPersona.name} has been added to your collection.`,
      });
    } else {
      toast({
        title: "Save failed",
        description: "Could not save the persona. Please try again.",
        variant: "destructive",
      });
    }
    return success;
  };

  const handleRegeneratePreview = () => {
    const newPersona = generateRandomPreview();
    handlePersonaSelect(newPersona.id);

    toast({
      title: "New persona generated!",
      description: `Meet ${newPersona.name} - a fresh random persona.`,
    });
  };

  const handleExpandPersona = (persona: Persona) => {
    setExpandedPersona(persona);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setExpandedPersona(null);
  };

  const gridCols = compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-glow-cyan font-orbitron">
          {compact ? 'Select Persona' : 'Choose AI Persona'}
        </h3>
        {!compact && (
          <div className="flex space-x-2">
            <Button
              className="btn-matrix"
              size="sm"
              onClick={handleGenerateRandomPersona}
              disabled={generatingRandom}
            >
              {generatingRandom ? 'Generating...' : '🎲 Random'}
            </Button>
            <Button
              className="btn-matrix"
              size="sm"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              {showCreateForm ? 'Cancel' : 'Create New'}
            </Button>
          </div>
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
            onClick={() => handlePersonaSelect(persona.id)}
            onDelete={() => handleDeletePersona(persona.id)}
            onExpand={() => handleExpandPersona(persona)}
            showDelete={!compact}
          />
        ))}

        {previewPersona && (
          <PreviewPersonaCard
            key={previewPersona.id}
            persona={previewPersona}
            isSelected={selectedPersonaId === previewPersona.id}
            onClick={() => handlePersonaSelect(previewPersona.id)}
            onSave={handleSavePreviewPersona}
            onRegenerate={handleRegeneratePreview}
            onExpand={() => handleExpandPersona(previewPersona)}
          />
        )}

        {showCustom && (
          <div
            className={`persona-card p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedPersonaId === 'custom'
                ? 'border-purple-500 bg-purple-50 selected'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handlePersonaSelect('custom')}
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

      {/* Persona Detail Modal */}
      {expandedPersona && (
        <PersonaDetailModal
          persona={expandedPersona}
          isOpen={isDetailModalOpen}
          onClose={handleCloseDetailModal}
          isPreview={expandedPersona.id.startsWith('preview-')}
          readOnly={true}
        />
      )}

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



