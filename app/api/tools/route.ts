import { NextResponse } from 'next/server';
// FIX: Using path aliases (@/) which are configured in the new tsconfig.json
import { getToolConfig } from '@/src/mcp/tool-registrar';
import * as allTools from '@/src/tools';
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as textToSpeech from '@google-cloud/text-to-speech';

// Initialize real Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.API_KEY!);

// Initialize real TTS client
const ttsClient = new textToSpeech.TextToSpeechClient();

export async function GET() {
  try {
    const { toolImplementations } = getToolConfig(genAI, ttsClient);

    const availableTools = toolImplementations.map((tool: any) => ({
      name: tool.name,
      description: tool.definition.description,
    }));

    return NextResponse.json(availableTools);
  } catch (error) {
    console.error("Failed to get tool configurations:", error);
    return NextResponse.json({ error: 'Failed to load tool configurations.' }, { status: 500 });
  }
}
