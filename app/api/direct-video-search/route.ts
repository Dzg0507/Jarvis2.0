// File: app/api/direct-video-search/route.ts

import { NextRequest, NextResponse } from 'next/server';

// This URL points to the endpoint in your src/server.ts that directly calls the video_search tool
const BACKEND_VIDEO_URL = 'http://localhost:3001/direct-video-search';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json({ error: 'No query provided.' }, { status: 400 });
    }

    // Forward the request to your actual backend video search endpoint
    const serverResponse = await fetch(BACKEND_VIDEO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (!serverResponse.ok) {
      const errorText = await serverResponse.text();
      throw new Error(`Direct video search server error: ${serverResponse.status} - ${errorText}`);
    }

    const data = await serverResponse.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('API Route /api/direct-video-search Error:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json({ error: 'Failed to perform direct video search.', details: errorMessage }, { status: 500 });
  }
}