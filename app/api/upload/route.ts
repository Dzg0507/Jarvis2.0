import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { mkdir } from 'fs/promises';
import path from 'path';

const uploadDir = path.join(process.cwd(), 'uploads');

export async function POST(req: NextRequest) {
  try {
    // Ensure the upload directory exists
    await mkdir(uploadDir, { recursive: true });

    const data = await req.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitize the filename to prevent directory traversal attacks
    const sanitizedFilename = path.basename(file.name);
    const filePath = path.join(uploadDir, sanitizedFilename);

    await writeFile(filePath, buffer);

    console.log(`File uploaded successfully: ${filePath}`);

    return NextResponse.json({
        success: true,
        message: `File "${sanitizedFilename}" uploaded successfully.`,
        filePath: `/uploads/${sanitizedFilename}` // Return a relative path for the client
    });

  } catch (error) {
    console.error('Upload API Error:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json({ error: 'Failed to upload file.', details: errorMessage }, { status: 500 });
  }
}
