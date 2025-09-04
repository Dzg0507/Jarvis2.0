'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface VoiceTestControlsProps {
  voiceId: string;
  voiceName: string;
  testText?: string;
  className?: string;
}

export function VoiceTestControls({ 
  voiceId, 
  voiceName, 
  testText = "Hello! This is a test of my voice.",
  className = ""
}: VoiceTestControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [selectedText, setSelectedText] = useState(testText);

  const sampleTexts = [
    "Hello! This is a test of my voice.",
    "I'm here to help you with whatever you need.",
    "Let me know if you have any questions or concerns.",
    "Thank you for choosing me as your AI assistant.",
    "I hope you find my voice pleasant and easy to understand."
  ];

  const handlePlay = async () => {
    if (isPlaying && currentAudio) {
      currentAudio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      setIsPlaying(true);

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: selectedText,
          voice_id: voiceId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      setCurrentAudio(audio);

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentAudio(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsPlaying(false);
        setCurrentAudio(null);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error) {
      console.error('Error playing voice test:', error);
      setIsPlaying(false);
      setCurrentAudio(null);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Sample Text Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-matrix-green">
          Test Text
        </label>
        <Select value={selectedText} onValueChange={setSelectedText}>
          <SelectTrigger className="terminal-input">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="glass border-matrix-green">
            {sampleTexts.map((text, index) => (
              <SelectItem key={index} value={text}>
                <span className="text-sm">{text.substring(0, 50)}...</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Play Controls */}
      <div className="flex items-center space-x-2">
        <Button
          onClick={handlePlay}
          size="sm"
          className="btn-matrix flex items-center"
          disabled={!voiceId}
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4 mr-2" />
              Stop
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Test Voice
            </>
          )}
        </Button>
        
        <div className="flex items-center text-sm text-matrix-green/80">
          <Volume2 className="w-4 h-4 mr-1" />
          {voiceName}
        </div>
      </div>

      {/* Current Text Preview */}
      <div className="text-xs text-matrix-green/60 p-2 bg-matrix-green/5 rounded border border-matrix-green/20">
        "{selectedText}"
      </div>
    </div>
  );
}
