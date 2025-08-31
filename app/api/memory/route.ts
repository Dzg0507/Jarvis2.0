import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const memoryFilePath = path.join(process.cwd(), 'memory.json');

export async function GET(req: NextRequest) {
    try {
        const data = await fs.readFile(memoryFilePath, 'utf-8');
        const memory = JSON.parse(data);
        return NextResponse.json(memory);
    } catch (error: unknown) {
        // If the file doesn't exist, return an empty memory state
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
            return NextResponse.json({
                fragments: [],
                sessions: [],
                topicMap: {},
                fileMap: {},
            });
        }
        // If it's another kind of error, return a server error
        console.error('Failed to read memory:', error);
        return NextResponse.json({ error: 'Failed to read memory' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const memory = await req.json();
        await fs.writeFile(memoryFilePath, JSON.stringify(memory, null, 2), 'utf-8');
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save memory' }, { status: 500 });
    }
}