import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from '@/src/config'; // Adjust path if needed

if (!config.ai.apiKey) {
    throw new Error("API_KEY environment variable not set");
}
const genAI = new GoogleGenerativeAI(config.ai.apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }

    const enhancementPrompt = `You are an AI prompt engineer. Your task is to take a user's simple persona description and enhance it into a detailed, effective system prompt for another AI. The enhanced prompt should be clear, concise, and provide strong guidance for the AI's behavior, tone, and purpose.

    User's prompt: "${prompt}"
    
    Enhanced prompt:`;

    const result = await model.generateContent(enhancementPrompt);
    const response = await result.response;
    const enhancedPrompt = response.text();

    return NextResponse.json({ enhancedPrompt });

  } catch (error) {
    console.error('Enhancement API Error:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json({ error: 'Failed to enhance prompt.', details: errorMessage }, { status: 500 });
  }
}
