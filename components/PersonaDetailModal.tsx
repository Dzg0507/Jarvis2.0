'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VoiceTestControls } from '@/components/ui/voice-test-controls';
import { Persona } from '@/lib/personas';
import { ALL_VOICES, getVoiceForPersona } from '@/lib/elevenlabs';
import { 
  X, 
  Save, 
  Volume2, 
  Palette, 
  User, 
  MessageSquare, 
  Shield, 
  Sparkles,
  RefreshCw,
  Eye,
  Settings
} from 'lucide-react';

interface PersonaDetailModalProps {
  persona: Persona;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updatedPersona: Persona) => Promise<boolean>;
  isPreview?: boolean;
  readOnly?: boolean;
}

export default function PersonaDetailModal({
  persona,
  isOpen,
  onClose,
  onSave,
  isPreview = false,
  readOnly = false
}: PersonaDetailModalProps) {
  const [editedPersona, setEditedPersona] = useState<Persona>(persona);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'voice' | 'style'>('overview');

  useEffect(() => {
    setEditedPersona(persona);
  }, [persona]);

  const handleSave = async () => {
    if (!onSave || readOnly) return;
    
    try {
      setSaving(true);
      await onSave(editedPersona);
      onClose();
    } catch (error) {
      console.error('Failed to save persona:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleVoiceChange = (voiceId: string) => {
    const voice = ALL_VOICES.find(v => v.voice_id === voiceId);
    if (voice) {
      setEditedPersona(prev => ({
        ...prev,
        voiceId: voice.voice_id,
        voiceName: voice.name,
        voiceDescription: voice.description
      }));
    }
  };

  const handleAutoAssignVoice = () => {
    const voice = getVoiceForPersona(editedPersona.personalityTraits);
    setEditedPersona(prev => ({
      ...prev,
      voiceId: voice.voice_id,
      voiceName: voice.name,
      voiceDescription: voice.description
    }));
  };

  const handleTraitToggle = (trait: string) => {
    setEditedPersona(prev => ({
      ...prev,
      personalityTraits: prev.personalityTraits.includes(trait)
        ? prev.personalityTraits.filter(t => t !== trait)
        : [...prev.personalityTraits, trait]
    }));
  };

  const availableTraits = [
    'helpful', 'friendly', 'wise', 'playful', 'serious', 'mysterious', 'creative',
    'analytical', 'energetic', 'calm', 'optimistic', 'sarcastic', 'enthusiastic',
    'patient', 'confident', 'humble', 'quirky', 'professional', 'casual', 'formal'
  ];

  const communicationStyles: Array<'formal' | 'casual' | 'technical' | 'creative' | 'quirky'> = [
    'formal', 'casual', 'technical', 'creative', 'quirky'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black border-2 border-matrix-green rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl shadow-matrix-green/20">
        {/* Header */}
        <div className={`p-6 border-b border-matrix-green/30 ${isPreview ? 'bg-cyan-900/20' : 'bg-matrix-dark-green/20'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div
                className="w-8 h-8 rounded-full flex-shrink-0 shadow-lg"
                style={{ 
                  backgroundColor: editedPersona.color, 
                  boxShadow: `0 0 12px ${editedPersona.color}` 
                }}
              />
              <div>
                <h2 className={`text-2xl font-bold font-orbitron ${isPreview ? 'text-cyan-400' : 'text-matrix-green'}`}>
                  {editedPersona.name}
                  {isPreview && (
                    <span className="ml-2 text-sm bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-full border border-cyan-400/30">
                      <Eye className="w-3 h-3 inline mr-1" />
                      PREVIEW
                    </span>
                  )}
                </h2>
                <p className={`text-sm ${isPreview ? 'text-cyan-400/80' : 'text-matrix-green/80'}`}>
                  {editedPersona.description}
                </p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className={`${isPreview ? 'text-cyan-400 hover:bg-cyan-400/10' : 'text-matrix-green hover:bg-matrix-green/10'}`}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 mt-4">
            {(['overview', 'voice', 'style'] as const).map((tab) => (
              <Button
                key={tab}
                onClick={() => setActiveTab(tab)}
                variant="ghost"
                size="sm"
                className={`capitalize ${
                  activeTab === tab
                    ? isPreview 
                      ? 'bg-cyan-400/20 text-cyan-400 border-b-2 border-cyan-400'
                      : 'bg-matrix-green/20 text-matrix-green border-b-2 border-matrix-green'
                    : isPreview
                      ? 'text-cyan-400/60 hover:text-cyan-400 hover:bg-cyan-400/10'
                      : 'text-matrix-green/60 hover:text-matrix-green hover:bg-matrix-green/10'
                }`}
              >
                {tab === 'overview' && <User className="w-4 h-4 mr-2" />}
                {tab === 'voice' && <Volume2 className="w-4 h-4 mr-2" />}
                {tab === 'style' && <Settings className="w-4 h-4 mr-2" />}
                {tab}
              </Button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold font-orbitron ${isPreview ? 'text-cyan-400' : 'text-matrix-green'}`}>
                  <User className="w-5 h-5 inline mr-2" />
                  Basic Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isPreview ? 'text-cyan-400' : 'text-matrix-green'}`}>
                      Name
                    </label>
                    <Input
                      value={editedPersona.name}
                      onChange={(e) => setEditedPersona(prev => ({ ...prev, name: e.target.value }))}
                      disabled={readOnly}
                      className="terminal-input"
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${isPreview ? 'text-cyan-400' : 'text-matrix-green'}`}>
                      Color
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={editedPersona.color}
                        onChange={(e) => setEditedPersona(prev => ({ ...prev, color: e.target.value }))}
                        disabled={readOnly}
                        className="w-10 h-10 rounded border border-matrix-green/30 bg-black"
                      />
                      <Input
                        value={editedPersona.color}
                        onChange={(e) => setEditedPersona(prev => ({ ...prev, color: e.target.value }))}
                        disabled={readOnly}
                        className="terminal-input flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${isPreview ? 'text-cyan-400' : 'text-matrix-green'}`}>
                    Description
                  </label>
                  <Textarea
                    value={editedPersona.description}
                    onChange={(e) => setEditedPersona(prev => ({ ...prev, description: e.target.value }))}
                    disabled={readOnly}
                    rows={3}
                    className="terminal-input"
                  />
                </div>
              </div>

              {/* System Prompt */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold font-orbitron ${isPreview ? 'text-cyan-400' : 'text-matrix-green'}`}>
                  <MessageSquare className="w-5 h-5 inline mr-2" />
                  System Prompt
                </h3>
                <Textarea
                  value={editedPersona.prompt}
                  onChange={(e) => setEditedPersona(prev => ({ ...prev, prompt: e.target.value }))}
                  disabled={readOnly}
                  rows={6}
                  className="terminal-input"
                />
              </div>

              {/* Example Responses */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold font-orbitron ${isPreview ? 'text-cyan-400' : 'text-matrix-green'}`}>
                  <Sparkles className="w-5 h-5 inline mr-2" />
                  Example Responses
                </h3>
                <div className="space-y-3">
                  {editedPersona.exampleResponses.map((example, index) => (
                    <div key={index} className="glass p-4 rounded-lg border border-matrix-green/30">
                      <div className={`text-sm font-medium mb-2 ${isPreview ? 'text-cyan-400' : 'text-matrix-green'}`}>
                        Q: {example.question}
                      </div>
                      <div className={`text-sm ${isPreview ? 'text-cyan-400/80' : 'text-matrix-green/80'}`}>
                        A: {example.response}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Restrictions */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold font-orbitron ${isPreview ? 'text-cyan-400' : 'text-matrix-green'}`}>
                  <Shield className="w-5 h-5 inline mr-2" />
                  Behavioral Restrictions
                </h3>
                <div className="space-y-2">
                  {editedPersona.restrictions.map((restriction, index) => (
                    <div key={index} className={`text-sm p-2 bg-red-900/20 border border-red-500/30 rounded ${isPreview ? 'text-cyan-400/80' : 'text-matrix-green/80'}`}>
                      • {restriction}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'voice' && (
            <div className="space-y-6">
              <h3 className={`text-lg font-semibold font-orbitron ${isPreview ? 'text-cyan-400' : 'text-matrix-green'}`}>
                <Volume2 className="w-5 h-5 inline mr-2" />
                Voice Settings
              </h3>

              {/* Current Voice */}
              <div className="glass p-4 rounded-lg border border-matrix-green/30">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className={`font-medium ${isPreview ? 'text-cyan-400' : 'text-matrix-green'}`}>
                      Current Voice: {editedPersona.voiceName || 'Not assigned'}
                    </h4>
                    <p className={`text-sm ${isPreview ? 'text-cyan-400/80' : 'text-matrix-green/80'}`}>
                      {editedPersona.voiceDescription || 'No voice description available'}
                    </p>
                  </div>
                  {editedPersona.voiceId && (
                    <VoiceTestControls
                      voiceId={editedPersona.voiceId}
                      voiceName={editedPersona.voiceName || 'Unknown'}
                      testText={`Hello! I'm ${editedPersona.name}. This is how I sound when we chat together.`}
                    />
                  )}
                </div>

                {!readOnly && (
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleAutoAssignVoice}
                      size="sm"
                      className="btn-matrix"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Auto-Assign Voice
                    </Button>
                  </div>
                )}
              </div>

              {/* Voice Selection */}
              {!readOnly && (
                <div className="space-y-4">
                  <label className={`block text-sm font-medium ${isPreview ? 'text-cyan-400' : 'text-matrix-green'}`}>
                    Select Voice
                  </label>
                  <Select value={editedPersona.voiceId || ''} onValueChange={handleVoiceChange}>
                    <SelectTrigger className="terminal-input">
                      <SelectValue placeholder="Choose a voice" />
                    </SelectTrigger>
                    <SelectContent className="glass border-matrix-green">
                      {ALL_VOICES.map((voice) => (
                        <SelectItem key={voice.voice_id} value={voice.voice_id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{voice.name}</span>
                            <span className="text-xs text-gray-400">{voice.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {activeTab === 'style' && (
            <div className="space-y-6">
              <h3 className={`text-lg font-semibold font-orbitron ${isPreview ? 'text-cyan-400' : 'text-matrix-green'}`}>
                <Palette className="w-5 h-5 inline mr-2" />
                Style & Personality
              </h3>

              {/* Communication Style */}
              <div className="space-y-4">
                <label className={`block text-sm font-medium ${isPreview ? 'text-cyan-400' : 'text-matrix-green'}`}>
                  Communication Style
                </label>
                <Select 
                  value={editedPersona.communicationStyle} 
                  onValueChange={(value: any) => setEditedPersona(prev => ({ ...prev, communicationStyle: value }))}
                  disabled={readOnly}
                >
                  <SelectTrigger className="terminal-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass border-matrix-green">
                    {communicationStyles.map((style) => (
                      <SelectItem key={style} value={style}>
                        <span className="capitalize">{style}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Personality Traits */}
              <div className="space-y-4">
                <label className={`block text-sm font-medium ${isPreview ? 'text-cyan-400' : 'text-matrix-green'}`}>
                  Personality Traits
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {availableTraits.map((trait) => (
                    <Button
                      key={trait}
                      onClick={() => !readOnly && handleTraitToggle(trait)}
                      variant="ghost"
                      size="sm"
                      disabled={readOnly}
                      className={`text-left justify-start ${
                        editedPersona.personalityTraits.includes(trait)
                          ? isPreview
                            ? 'bg-cyan-400/20 text-cyan-400 border border-cyan-400/30'
                            : 'bg-matrix-green/20 text-matrix-green border border-matrix-green/30'
                          : isPreview
                            ? 'text-cyan-400/60 hover:bg-cyan-400/10 border border-cyan-400/20'
                            : 'text-matrix-green/60 hover:bg-matrix-green/10 border border-matrix-green/20'
                      }`}
                    >
                      {trait}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Response Patterns */}
              <div className="space-y-4">
                <h4 className={`font-medium ${isPreview ? 'text-cyan-400' : 'text-matrix-green'}`}>
                  Response Patterns
                </h4>
                <div className="space-y-2">
                  {editedPersona.responsePatterns.map((pattern, index) => (
                    <div key={index} className={`text-sm p-2 glass rounded border border-matrix-green/30 ${isPreview ? 'text-cyan-400/80' : 'text-matrix-green/80'}`}>
                      "{pattern}"
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!readOnly && onSave && (
          <div className={`p-6 border-t border-matrix-green/30 flex justify-end space-x-3 ${isPreview ? 'bg-cyan-900/10' : 'bg-matrix-dark-green/10'}`}>
            <Button
              onClick={onClose}
              variant="ghost"
              className={isPreview ? 'text-cyan-400 hover:bg-cyan-400/10' : 'text-matrix-green hover:bg-matrix-green/10'}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="btn-matrix"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border border-matrix-green border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
