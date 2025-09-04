// File: app/api/tts/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsTTS } from '@/lib/elevenlabs-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voice_id, settings } = body;

    if (!text || !voice_id) {
      return NextResponse.json({ error: 'Text and voice_id are required.' }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ElevenLabs API key not configured.' }, { status: 500 });
    }

    const tts = new ElevenLabsTTS(apiKey);
    const audioBuffer = await tts.synthesizeSpeech(text, voice_id, settings);

    // Return the audio as a blob
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('ElevenLabs TTS API Error:', error);
    return NextResponse.json({
      error: 'Failed to synthesize speech.',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}