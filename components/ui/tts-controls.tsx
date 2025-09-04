'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { ttsManager, getVoiceForPersona } from '@/lib/elevenlabs';

interface TTSControlsProps {
  text: string;
  personaTraits?: string[];
  voiceId?: string;
  className?: string;
}

export function TTSControls({ 
  text, 
  personaTraits = [], 
  voiceId, 
  className = '' 
}: TTSControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    // Check if TTS is enabled (client-side only)
    if (typeof window !== 'undefined') {
      const enabled = localStorage.getItem('tts_enabled') !== 'false';
      setIsEnabled(enabled);
    }
  }, []);

  useEffect(() => {
    // Update playing state based on TTS manager
    const checkPlayingState = () => {
      setIsPlaying(ttsManager.isPlaying());
    };

    const interval = setInterval(checkPlayingState, 100);
    return () => clearInterval(interval);
  }, []);

  const handlePlay = async () => {
    if (isPlaying) {
      ttsManager.stop();
      setIsPlaying(false);
    } else {
      try {
        // Determine voice to use
        let selectedVoiceId = voiceId;
        if (!selectedVoiceId && personaTraits.length > 0) {
          const voice = getVoiceForPersona(personaTraits);
          selectedVoiceId = voice.voice_id;
        }
        
        // Fallback to default voice
        if (!selectedVoiceId) {
          selectedVoiceId = 'pNInz6obpgDQGcFmaJgB'; // Adam default voice
        }

        setIsPlaying(true);
        await ttsManager.speak(text, selectedVoiceId);
        setIsPlaying(false);
      } catch (error) {
        console.error('TTS playback error:', error);
        setIsPlaying(false);
      }
    }
  };

  const handleToggleEnabled = () => {
    const newEnabled = !isEnabled;
    setIsEnabled(newEnabled);
    ttsManager.setEnabled(newEnabled);
    
    if (!newEnabled && isPlaying) {
      ttsManager.stop();
      setIsPlaying(false);
    }
  };

  if (!text.trim()) return null;

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handlePlay}
        disabled={!isEnabled}
        className="h-6 w-6 p-0 text-matrix-green/70 hover:text-matrix-green hover:bg-matrix-green/10 transition-colors"
        title={isPlaying ? 'Stop speech' : 'Play speech'}
      >
        {isPlaying ? (
          <Pause className="h-3 w-3" />
        ) : (
          <Play className="h-3 w-3" />
        )}
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggleEnabled}
        className="h-6 w-6 p-0 text-matrix-green/50 hover:text-matrix-green hover:bg-matrix-green/10 transition-colors"
        title={isEnabled ? 'Disable TTS' : 'Enable TTS'}
      >
        {isEnabled ? (
          <Volume2 className="h-3 w-3" />
        ) : (
          <VolumeX className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}

interface VoiceTestControlsProps {
  voiceId: string;
  voiceName: string;
  testText?: string;
  className?: string;
}

export function VoiceTestControls({ 
  voiceId, 
  voiceName, 
  testText = "Hello! This is a test of the selected voice. How do you like the way I sound?",
  className = '' 
}: VoiceTestControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleTest = async () => {
    if (isPlaying) {
      ttsManager.stop();
      setIsPlaying(false);
    } else {
      try {
        setIsPlaying(true);
        await ttsManager.speak(testText, voiceId);
        setIsPlaying(false);
      } catch (error) {
        console.error('Voice test error:', error);
        setIsPlaying(false);
      }
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleTest}
      className={`btn-matrix ${className}`}
      disabled={isPlaying}
    >
      {isPlaying ? (
        <>
          <Pause className="h-4 w-4 mr-2" />
          Playing...
        </>
      ) : (
        <>
          <Play className="h-4 w-4 mr-2" />
          Test {voiceName}
        </>
      )}
    </Button>
  );
}
