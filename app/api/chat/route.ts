import { NextRequest, NextResponse } from 'next/server';

const BACKEND_SERVER_URL = 'http://localhost:3001/mcp';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Destructure both prompt and the new persona field
    const { prompt, persona } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'No prompt provided.' }, { status: 400 });
    }

    const serverResponse = await fetch(BACKEND_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Pass both fields to the backend
      body: JSON.stringify({ prompt, persona }),
    });

    if (!serverResponse.ok) {
      const errorData = await serverResponse.text();
      console.error('Backend server error:', errorData);
      return NextResponse.json({ error: 'The AI server responded with an error.', details: errorData }, { status: serverResponse.status });
    }

    const data = await serverResponse.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Failed to connect to the AI server.' }, { status: 500 });
  }
}