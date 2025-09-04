// Server-side ElevenLabs TTS implementation
// This file is for use in API routes and server-side code only

export interface Voice {
  voice_id: string;
  name: string;
  category: string;
  description: string;
  preview_url?: string;
}

export interface TTSSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}

// Predefined voices for different persona types
export const PERSONA_VOICES: { [key: string]: Voice } = {
  helpful: {
    voice_id: 'EXAVITQu4vr4xnSDxMaL', // Bella - warm and friendly
    name: 'Bella',
    category: 'helpful',
    description: 'Warm, friendly, and approachable voice perfect for helpful assistants'
  },
  wise: {
    voice_id: 'ErXwobaYiN019PkySvjV', // Antoni - wise and thoughtful
    name: 'Antoni',
    category: 'wise',
    description: 'Deep, thoughtful voice ideal for wise and philosophical personas'
  },
  playful: {
    voice_id: 'AZnzlk1XvdvUeBnXmlld', // Domi - energetic and playful
    name: 'Domi',
    category: 'playful',
    description: 'Energetic and playful voice for fun and quirky personas'
  },
  serious: {
    voice_id: 'VR6AewLTigWG4xSOukaG', // Arnold - serious and authoritative
    name: 'Arnold',
    category: 'serious',
    description: 'Authoritative and serious voice for professional personas'
  },
  mysterious: {
    voice_id: 'onwK4e9ZLuTAKqWW03F9', // Daniel - mysterious and intriguing
    name: 'Daniel',
    category: 'mysterious',
    description: 'Mysterious and intriguing voice for enigmatic personas'
  },
  creative: {
    voice_id: 'ThT5KcBeYPX3keUQqHPh', // Dorothy - creative and expressive
    name: 'Dorothy',
    category: 'creative',
    description: 'Expressive and creative voice for artistic personas'
  },
  technical: {
    voice_id: 'IKne3meq5aSn9XLyUdCD', // Charlie - clear and technical
    name: 'Charlie',
    category: 'technical',
    description: 'Clear and precise voice for technical and analytical personas'
  },
  default: {
    voice_id: 'pNInz6obpgDQGcFmaJgB', // Adam - neutral default
    name: 'Adam',
    category: 'default',
    description: 'Neutral and versatile voice suitable for any persona'
  }
};

export const ALL_VOICES: Voice[] = [
  PERSONA_VOICES.default,
  PERSONA_VOICES.helpful,
  PERSONA_VOICES.wise,
  PERSONA_VOICES.playful,
  PERSONA_VOICES.serious,
  PERSONA_VOICES.mysterious,
  PERSONA_VOICES.creative,
  PERSONA_VOICES.technical,
  {
    voice_id: 'TxGEqnHWrfWFTfGW9XjX', // Josh - confident
    name: 'Josh',
    category: 'confident',
    description: 'Confident and charismatic voice'
  },
  {
    voice_id: 'CYw3kZ02Hs0563khs1Fj', // Emily - gentle
    name: 'Emily',
    category: 'gentle',
    description: 'Gentle and soothing voice'
  }
];

export function getVoiceForPersona(personalityTraits: string[]): Voice {
  // Analyze personality traits to select appropriate voice
  const traits = personalityTraits.map(t => t.toLowerCase());
  
  if (traits.some(t => ['wise', 'philosophical', 'sage'].includes(t))) {
    return PERSONA_VOICES.wise;
  }
  
  if (traits.some(t => ['playful', 'quirky', 'energetic', 'fun'].includes(t))) {
    return PERSONA_VOICES.playful;
  }
  
  if (traits.some(t => ['serious', 'professional', 'formal', 'authoritative'].includes(t))) {
    return PERSONA_VOICES.serious;
  }
  
  if (traits.some(t => ['mysterious', 'enigmatic', 'dark', 'secretive'].includes(t))) {
    return PERSONA_VOICES.mysterious;
  }
  
  if (traits.some(t => ['creative', 'artistic', 'expressive', 'imaginative'].includes(t))) {
    return PERSONA_VOICES.creative;
  }
  
  if (traits.some(t => ['technical', 'analytical', 'logical', 'precise'].includes(t))) {
    return PERSONA_VOICES.technical;
  }
  
  if (traits.some(t => ['helpful', 'friendly', 'kind', 'supportive'].includes(t))) {
    return PERSONA_VOICES.helpful;
  }
  
  return PERSONA_VOICES.default;
}

export class ElevenLabsTTS {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async synthesizeSpeech(
    text: string, 
    voiceId: string, 
    settings: Partial<TTSSettings> = {}
  ): Promise<ArrayBuffer> {
    const defaultSettings: TTSSettings = {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true,
      ...settings
    };

    const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': this.apiKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: defaultSettings,
      }),
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
    }

    return await response.arrayBuffer();
  }

  async getVoices(): Promise<Voice[]> {
    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.status}`);
      }

      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      console.error('Error fetching ElevenLabs voices:', error);
      return ALL_VOICES; // Fallback to predefined voices
    }
  }
}
