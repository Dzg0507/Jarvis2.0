'use client';

import { useState, useEffect, useCallback } from 'react';
import { Persona } from '@/lib/personas';
import { generateRandomPersona } from '@/lib/randomPersonaGenerator';

interface UsePersonasReturn {
  personas: Persona[];
  loading: boolean;
  error: string | null;
  selectedPersonaId: string;
  customPersona: string;
  previewPersona: Persona | null;
  setSelectedPersonaId: (id: string) => void;
  setCustomPersona: (prompt: string) => void;
  generatePersona: (description: string) => Promise<Persona | null>;
  deletePersona: (id: string) => Promise<boolean>;
  refreshPersonas: () => Promise<void>;
  getActivePersonaPrompt: () => string;
  getPersonaById: (id: string) => Persona | undefined;
  setPreviewPersona: (persona: Persona | null) => void;
  savePreviewPersona: () => Promise<boolean>;
  generateRandomPreview: () => Persona;
  clearPreviewPersona: () => void;
}

export function usePersonas(): UsePersonasReturn {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPersonaId, setSelectedPersonaId] = useState('helpful-assistant');
  const [customPersona, setCustomPersona] = useState('');
  const [previewPersona, setPreviewPersona] = useState<Persona | null>(null);

  const loadPersonas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/generate-persona');
      if (!response.ok) {
        throw new Error(`Failed to load personas: ${response.statusText}`);
      }
      
      const data = await response.json();
      setPersonas(Array.isArray(data) ? data : []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load personas';
      setError(errorMessage);
      console.error('Error loading personas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const generatePersona = useCallback(async (description: string): Promise<Persona | null> => {
    try {
      setError(null);
      
      const response = await fetch('/api/generate-persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate persona');
      }

      const newPersona = await response.json();
      setPersonas(prev => [...prev, newPersona]);
      return newPersona;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate persona';
      setError(errorMessage);
      console.error('Error generating persona:', err);
      return null;
    }
  }, []);

  const deletePersona = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      
      const response = await fetch(`/api/generate-persona?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete persona');
      }

      setPersonas(prev => prev.filter(p => p.id !== id));
      
      // If the deleted persona was selected, switch to default
      if (selectedPersonaId === id) {
        setSelectedPersonaId('helpful-assistant');
      }
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete persona';
      setError(errorMessage);
      console.error('Error deleting persona:', err);
      return false;
    }
  }, [selectedPersonaId]);

  const refreshPersonas = useCallback(async () => {
    await loadPersonas();
  }, [loadPersonas]);

  const getActivePersonaPrompt = useCallback(() => {
    if (selectedPersonaId === 'custom') {
      return customPersona;
    }
    // Check preview persona first
    if (previewPersona && previewPersona.id === selectedPersonaId) {
      return previewPersona.prompt;
    }
    const selectedPersona = personas.find(p => p.id === selectedPersonaId);
    return selectedPersona?.prompt || '';
  }, [selectedPersonaId, customPersona, personas, previewPersona]);

  const getPersonaById = useCallback((id: string) => {
    // Check preview persona first
    if (previewPersona && previewPersona.id === id) {
      return previewPersona;
    }
    return personas.find(p => p.id === id);
  }, [personas, previewPersona]);

  const generateRandomPreview = useCallback(() => {
    const randomPersona = generateRandomPersona();
    // Mark as preview with a special ID prefix
    randomPersona.id = `preview-${randomPersona.id}`;
    setPreviewPersona(randomPersona);
    return randomPersona;
  }, []);

  const clearPreviewPersona = useCallback(() => {
    setPreviewPersona(null);
  }, []);

  const savePreviewPersona = useCallback(async (): Promise<boolean> => {
    if (!previewPersona) return false;

    try {
      setError(null);

      // Remove preview prefix and ensure unique ID
      const personaToSave = {
        ...previewPersona,
        id: previewPersona.id.replace('preview-', '')
      };

      const response = await fetch('/api/generate-persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `Saved random persona: ${personaToSave.description}`,
          personaData: personaToSave
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save preview persona');
      }

      const savedPersona = await response.json();
      setPersonas(prev => [...prev, savedPersona]);
      setPreviewPersona(null); // Clear preview
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save preview persona';
      setError(errorMessage);
      console.error('Error saving preview persona:', err);
      return false;
    }
  }, [previewPersona]);

  useEffect(() => {
    loadPersonas();
  }, [loadPersonas]);

  return {
    personas,
    loading,
    error,
    selectedPersonaId,
    customPersona,
    previewPersona,
    setSelectedPersonaId,
    setCustomPersona,
    generatePersona,
    deletePersona,
    refreshPersonas,
    getActivePersonaPrompt,
    getPersonaById,
    setPreviewPersona,
    savePreviewPersona,
    generateRandomPreview,
    clearPreviewPersona,
  };
}