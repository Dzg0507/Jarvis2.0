import path from 'path';
import { promises as fs } from 'fs';
import { logger } from './logger.js';

const ALLOWED_DIRECTORIES = [
  process.cwd(),
  path.join(process.cwd(), 'uploads'),
  path.join(process.cwd(), 'temp'),
];

export function validateFilePath(filePath: string): string {
  const resolvedPath = path.resolve(filePath);
  
  const isAllowed = ALLOWED_DIRECTORIES.some(allowedDir => 
    resolvedPath.startsWith(path.resolve(allowedDir))
  );
  
  if (!isAllowed) {
    logger.error('File access denied', { path: filePath, resolved: resolvedPath });
    throw new Error(`Access denied: Path outside allowed directories`);
  }
  
  return resolvedPath;
}

export async function safeReadFile(filePath: string): Promise<string> {
  const safePath = validateFilePath(filePath);
  
  try {
    const stats = await fs.stat(safePath);
    if (stats.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('File too large');
    }
    
    return await fs.readFile(safePath, 'utf-8');
  } catch (error) {
    logger.error('File read failed', { path: filePath, error });
    throw new Error(`Failed to read file: ${error}`);
  }
}

export async function safeWriteFile(filePath: string, content: string): Promise<void> {
  const safePath = validateFilePath(filePath);
  
  try {
    await fs.writeFile(safePath, content, 'utf-8');
    logger.info('File written successfully', { path: filePath });
  } catch (error) {
    logger.error('File write failed', { path: filePath, error });
    throw new Error(`Failed to write file: ${error}`);
  }
}