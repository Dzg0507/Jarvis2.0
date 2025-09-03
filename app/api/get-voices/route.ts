// File: app/api/get-voices/route.ts

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Ensures this route is not statically optimized

const BACKEND_SERVER_URL = 'http://localhost:8080/api/get-voices';

export async function GET() {
  try {
    const serverResponse = await fetch(BACKEND_SERVER_URL);

    if (!serverResponse.ok) {
      throw new Error(`Backend server error: ${serverResponse.status}`);
    }

    const data = await serverResponse.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('API Route /api/get-voices Error:', error);
    return NextResponse.json({ error: 'Failed to fetch voices.' }, { status: 500 });
  }
}