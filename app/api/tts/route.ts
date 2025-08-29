// File: app/api/tts/route.ts

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_TTS_URL = 'http://localhost:3001/tts';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voice_id } = body;

    if (!text || !voice_id) {
      return NextResponse.json({ error: 'Text and voice_id are required.' }, { status: 400 });
    }

    const serverResponse = await fetch(BACKEND_TTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice_id }),
    });

    if (!serverResponse.ok) {
      throw new Error(`Backend TTS server error: ${serverResponse.status}`);
    }

    const data = await serverResponse.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('API Route /api/tts Error:', error);
    return NextResponse.json({ error: 'Failed to synthesize speech.' }, { status: 500 });
  }
}