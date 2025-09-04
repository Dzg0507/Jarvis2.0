'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VoiceTestControls } from '@/components/ui/tts-controls';
import { ALL_VOICES, Voice, TTSSettings } from '@/lib/elevenlabs';
import { Volume2, Settings } from 'lucide-react';

interface VoiceSettingsProps {
  className?: string;
}

export function VoiceSettings({ className = '' }: VoiceSettingsProps) {
  const [selectedVoice, setSelectedVoice] = useState<Voice>(ALL_VOICES[0]);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [settings, setSettings] = useState<TTSSettings>({
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.0,
    use_speaker_boost: true,
  });

  useEffect(() => {
    // Load saved settings (client-side only)
    if (typeof window !== 'undefined') {
      const savedEnabled = localStorage.getItem('tts_enabled');
      const savedVoiceId = localStorage.getItem('tts_voice_id');
      const savedSettings = localStorage.getItem('tts_settings');

      if (savedEnabled !== null) {
        setTtsEnabled(savedEnabled === 'true');
      }

      if (savedVoiceId) {
        const voice = ALL_VOICES.find(v => v.voice_id === savedVoiceId);
        if (voice) {
          setSelectedVoice(voice);
        }
      }

      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setSettings(prev => ({ ...prev, ...parsed }));
        } catch (error) {
          console.error('Failed to parse saved TTS settings:', error);
        }
      }
    }
  }, []);

  const saveSettings = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tts_enabled', ttsEnabled.toString());
      localStorage.setItem('tts_voice_id', selectedVoice.voice_id);
      localStorage.setItem('tts_settings', JSON.stringify(settings));
    }
  };

  useEffect(() => {
    saveSettings();
  }, [ttsEnabled, selectedVoice, settings]);

  const handleVoiceChange = (voiceId: string) => {
    const voice = ALL_VOICES.find(v => v.voice_id === voiceId);
    if (voice) {
      setSelectedVoice(voice);
    }
  };

  const handleSettingChange = (key: keyof TTSSettings, value: number | boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const testTexts = [
    "Hello! This is a test of the selected voice. How do you like the way I sound?",
    "I am an AI assistant ready to help you with any questions or tasks you might have.",
    "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet.",
    "Welcome to the future of artificial intelligence. I'm here to make your digital experience more engaging and natural."
  ];

  const [selectedTestText, setSelectedTestText] = useState(testTexts[0]);

  return (
    <Card className={`glass border-neon-blue ${className}`}>
      <CardHeader>
        <CardTitle className="text-glow-blue font-orbitron flex items-center">
          <Volume2 className="w-5 h-5 mr-2" />
          VOICE & SPEECH SETTINGS
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* TTS Enable/Disable */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-matrix-green font-medium">Enable Text-to-Speech</Label>
            <p className="text-sm text-gray-400 mt-1">
              Allow AI responses to be spoken aloud
            </p>
          </div>
          <Switch
            checked={ttsEnabled}
            onCheckedChange={setTtsEnabled}
            className="data-[state=checked]:bg-matrix-green"
          />
        </div>

        {ttsEnabled && (
          <>
            {/* Voice Selection */}
            <div className="space-y-3">
              <Label className="text-matrix-green font-medium">Voice Selection</Label>
              <Select value={selectedVoice.voice_id} onValueChange={handleVoiceChange}>
                <SelectTrigger className="terminal-input">
                  <SelectValue placeholder="Select a voice" />
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
              
              <div className="p-3 bg-matrix-green/10 border border-matrix-green/30 rounded-lg">
                <p className="text-sm text-matrix-green mb-2">
                  <strong>Selected:</strong> {selectedVoice.name}
                </p>
                <p className="text-xs text-gray-400 mb-3">
                  {selectedVoice.description}
                </p>
                <VoiceTestControls
                  voiceId={selectedVoice.voice_id}
                  voiceName={selectedVoice.name}
                  testText={selectedTestText}
                />
              </div>
            </div>

            {/* Test Text Selection */}
            <div className="space-y-3">
              <Label className="text-matrix-green font-medium">Test Text</Label>
              <Select value={selectedTestText} onValueChange={setSelectedTestText}>
                <SelectTrigger className="terminal-input">
                  <SelectValue placeholder="Select test text" />
                </SelectTrigger>
                <SelectContent className="glass border-matrix-green">
                  {testTexts.map((text, index) => (
                    <SelectItem key={index} value={text}>
                      <span className="truncate max-w-xs">
                        {text.substring(0, 50)}...
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Voice Settings */}
            <div className="space-y-4">
              <div className="flex items-center">
                <Settings className="w-4 h-4 mr-2 text-matrix-green" />
                <Label className="text-matrix-green font-medium">Advanced Voice Settings</Label>
              </div>

              {/* Stability */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm">Stability</Label>
                  <span className="text-xs text-gray-400">{settings.stability.toFixed(2)}</span>
                </div>
                <Slider
                  value={[settings.stability]}
                  onValueChange={([value]) => handleSettingChange('stability', value)}
                  max={1}
                  min={0}
                  step={0.01}
                  className="w-full"
                />
                <p className="text-xs text-gray-400">
                  Higher values make the voice more stable and consistent
                </p>
              </div>

              {/* Similarity Boost */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm">Similarity Boost</Label>
                  <span className="text-xs text-gray-400">{settings.similarity_boost.toFixed(2)}</span>
                </div>
                <Slider
                  value={[settings.similarity_boost]}
                  onValueChange={([value]) => handleSettingChange('similarity_boost', value)}
                  max={1}
                  min={0}
                  step={0.01}
                  className="w-full"
                />
                <p className="text-xs text-gray-400">
                  Enhances similarity to the original voice
                </p>
              </div>

              {/* Style */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-sm">Style</Label>
                  <span className="text-xs text-gray-400">{settings.style.toFixed(2)}</span>
                </div>
                <Slider
                  value={[settings.style]}
                  onValueChange={([value]) => handleSettingChange('style', value)}
                  max={1}
                  min={0}
                  step={0.01}
                  className="w-full"
                />
                <p className="text-xs text-gray-400">
                  Adjusts the expressiveness and style of the voice
                </p>
              </div>

              {/* Speaker Boost */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Speaker Boost</Label>
                  <p className="text-xs text-gray-400 mt-1">
                    Enhances voice clarity and presence
                  </p>
                </div>
                <Switch
                  checked={settings.use_speaker_boost}
                  onCheckedChange={(checked) => handleSettingChange('use_speaker_boost', checked)}
                  className="data-[state=checked]:bg-matrix-green"
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
