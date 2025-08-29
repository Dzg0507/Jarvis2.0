import { NextResponse } from 'next/server';
import { getToolConfig } from '@/src/mcp/tool-registrar';

// Mock clients since we only need tool definitions, not implementations.
const mockGenAI = {} as any;
const mockTtsClient = {} as any;

export async function GET() {
  try {
    const { toolImplementations } = getToolConfig(mockGenAI, mockTtsClient);

    const availableTools = toolImplementations.map(tool => ({
      name: tool.name,
      description: tool.definition.description,
    }));

    return NextResponse.json(availableTools);
  } catch (error) {
    console.error("Failed to get tool configurations:", error);
    return NextResponse.json({ error: 'Failed to load tool configurations.' }, { status: 500 });
  }
}
