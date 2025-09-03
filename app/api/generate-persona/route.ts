import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from '@/src/config';
import fs from 'fs/promises';
import path from 'path';
import { Persona, defaultPersonas } from '@/lib/personas';

if (!config.ai.apiKey) {
    throw new Error("API_KEY environment variable not set");
}
const genAI = new GoogleGenerativeAI(config.ai.apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const personasFilePath = path.join(process.cwd(), 'lib', 'personas.json');

async function ensurePersonasFile(): Promise<void> {
    try {
        await fs.access(personasFilePath);
    } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            await fs.mkdir(path.dirname(personasFilePath), { recursive: true });
            await fs.writeFile(personasFilePath, JSON.stringify(defaultPersonas, null, 2), 'utf-8');
        } else {
            throw error;
        }
    }
}

async function readPersonas(): Promise<Persona[]> {
    try {
        await ensurePersonasFile();
        const data = await fs.readFile(personasFilePath, 'utf-8');
        const personas = JSON.parse(data);
        return Array.isArray(personas) ? personas : defaultPersonas;
    } catch (error) {
        console.error('Error reading personas:', error);
        return defaultPersonas;
    }
}

async function writePersonas(personas: Persona[]): Promise<void> {
    try {
        await ensurePersonasFile();
        await fs.writeFile(personasFilePath, JSON.stringify(personas, null, 2), 'utf-8');
    } catch (error) {
        console.error('Error writing personas:', error);
        throw error;
    }
}

export async function POST(req: NextRequest) {
    try {
        const { description } = await req.json();

        if (!description || typeof description !== 'string' || !description.trim()) {
            return NextResponse.json({ error: 'Description is required and must be a non-empty string.' }, { status: 400 });
        }

        const generationPrompt = `You are an expert AI persona designer. Create a unique, memorable AI personality that users will love interacting with.

User's description: "${description.trim()}"

Generate a complete persona with distinctive personality traits, communication style, and behavioral patterns. Make it engaging and memorable, not generic.

REQUIREMENTS:
- Create a specific character with clear personality quirks
- Include unique speech patterns and expressions
- Define what makes this persona special and different
- Add behavioral restrictions to maintain character consistency
- Make it someone users would want to talk to regularly
- Use a creative, unique ID in kebab-case format
- Choose an appropriate hex color that matches the personality

Return ONLY a JSON object with this exact structure:
{
  "id": "unique-kebab-case-id",
  "name": "Memorable Character Name",
  "description": "Brief, engaging description (20-30 words)",
  "prompt": "Detailed system prompt defining personality, speech patterns, behavior, and quirks (200-400 words)",
  "communicationStyle": "formal",
  "personalityTraits": ["trait1", "trait2", "trait3", "trait4"],
  "responsePatterns": ["typical phrase 1", "typical phrase 2", "typical phrase 3"],
  "exampleResponses": [
    {
      "question": "How are you today?",
      "response": "Character-appropriate response showing personality"
    }
  ],
  "restrictions": ["behavioral restriction 1", "behavioral restriction 2"],
  "color": "#4F46E5"
}`;

        const result = await model.generateContent(generationPrompt);
        const response = await result.response;
        let personaJson = response.text().replace(/```json|```/g, '').trim();
        
        // Clean up any potential markdown formatting
        personaJson = personaJson.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '');
        
        let newPersona: Persona;
        try {
            newPersona = JSON.parse(personaJson);
        } catch (parseError) {
            console.error('Failed to parse generated persona JSON:', parseError);
            console.error('Raw response:', personaJson);
            return NextResponse.json({ 
                error: 'Failed to generate valid persona format.', 
                details: 'The AI generated an invalid response format.' 
            }, { status: 500 });
        }

        // Validate required fields
        const requiredFields = ['id', 'name', 'description', 'prompt', 'communicationStyle', 'personalityTraits', 'responsePatterns', 'exampleResponses', 'restrictions', 'color'];
        for (const field of requiredFields) {
            if (!newPersona[field as keyof Persona]) {
                return NextResponse.json({ 
                    error: 'Generated persona is missing required fields.', 
                    details: `Missing field: ${field}` 
                }, { status: 500 });
            }
        }

        // Ensure arrays are actually arrays
        if (!Array.isArray(newPersona.personalityTraits)) newPersona.personalityTraits = [];
        if (!Array.isArray(newPersona.responsePatterns)) newPersona.responsePatterns = [];
        if (!Array.isArray(newPersona.exampleResponses)) newPersona.exampleResponses = [];
        if (!Array.isArray(newPersona.restrictions)) newPersona.restrictions = [];

        // Validate color format
        if (!/^#[0-9A-Fa-f]{6}$/.test(newPersona.color)) {
            newPersona.color = '#4F46E5'; // Default color
        }

        const personas = await readPersonas();
        
        // Check for duplicate IDs
        if (personas.some(p => p.id === newPersona.id)) {
            newPersona.id = `${newPersona.id}-${Date.now()}`;
        }

        personas.push(newPersona);
        await writePersonas(personas);

        return NextResponse.json(newPersona);

    } catch (error) {
        console.error('Persona Generation API Error:', error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return NextResponse.json({ 
            error: 'Failed to generate persona.', 
            details: errorMessage 
        }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const personas = await readPersonas();
        return NextResponse.json(personas);
    } catch (error) {
        console.error('Failed to read personas:', error);
        return NextResponse.json({ 
            error: 'Failed to read personas.',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const personaId = searchParams.get('id');

        if (!personaId) {
            return NextResponse.json({ error: 'Persona ID is required.' }, { status: 400 });
        }

        const personas = await readPersonas();
        const filteredPersonas = personas.filter(p => p.id !== personaId && !p.isDefault);
        
        if (filteredPersonas.length === personas.length) {
            return NextResponse.json({ error: 'Persona not found or cannot be deleted.' }, { status: 404 });
        }

        await writePersonas(filteredPersonas);
        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Failed to delete persona:', error);
        return NextResponse.json({ 
            error: 'Failed to delete persona.',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
