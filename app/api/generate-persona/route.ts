import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from '@/src/config';
import fs from 'fs/promises';
import path from 'path';
import { Persona } from '@/lib/personas';

if (!config.ai.apiKey) {
    throw new Error("API_KEY environment variable not set");
}
const genAI = new GoogleGenerativeAI(config.ai.apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const personasFilePath = path.join(process.cwd(), 'lib', 'personas.json');

async function readPersonas(): Promise<Persona[]> {
    try {
        const data = await fs.readFile(personasFilePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // If the file doesn't exist, return the default personas
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

async function writePersonas(personas: Persona[]): Promise<void> {
    await fs.writeFile(personasFilePath, JSON.stringify(personas, null, 2), 'utf-8');
}

export async function POST(req: NextRequest) {
  try {
    const { description } = await req.json();

    if (!description) {
      return NextResponse.json({ error: 'Description is required.' }, { status: 400 });
    }

    const generationPrompt = `You are an AI persona generator. Your task is to take a user's simple description and generate a complete persona object for another AI. The persona object should include a unique 'id', a short 'name', the user's original 'description', and a detailed 'prompt' for the AI.

    User's description: "${description}"

    Generate a JSON object with the following structure: { "id": "a-unique-id", "name": "A short name", "description": "The original description", "prompt": "A detailed system prompt for the AI." }`;

    const result = await model.generateContent(generationPrompt);
    const response = await result.response;
    const personaJson = response.text().replace(/```json|```/g, '').trim();
    const newPersona: Persona = JSON.parse(personaJson);

    const personas = await readPersonas();
    personas.push(newPersona);
    await writePersonas(personas);

    return NextResponse.json(newPersona);

  } catch (error) {
    console.error('Persona Generation API Error:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json({ error: 'Failed to generate persona.', details: errorMessage }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
    try {
        const personas = await readPersonas();
        return NextResponse.json(personas);
    } catch (error) {
        console.error('Failed to read personas:', error);
        return NextResponse.json({ error: 'Failed to read personas.' }, { status: 500 });
    }
}
