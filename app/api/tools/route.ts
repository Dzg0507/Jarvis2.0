import { NextResponse } from 'next/server';
// FIX: Using path aliases (@/) which are configured in the new tsconfig.json
import { getToolConfig } from '@/src/mcp/tool-registrar';
import * as allTools from '@/src/tools';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Mock the GoogleGenerativeAI and TTS clients.
const mockGenAI = {
  getGenerativeModel: () => ({
    generateContent: () => ({
      response: {
        text: () => 'Mock content'
      }
    })
  }),
} as unknown as GoogleGenerativeAI;

// Mock the TTS client.
const mockTtsClient = {} as any;

export async function GET() {
  try {
    const { toolImplementations } = getToolConfig(mockGenAI, mockTtsClient);

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