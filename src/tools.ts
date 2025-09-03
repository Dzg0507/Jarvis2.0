import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const fsPromises = fs.promises;

export const listFiles = async (dirPath: string): Promise<string> => {
  try {
    const resolvedPath = path.resolve(dirPath);
    if (!resolvedPath.startsWith(process.cwd())) {
      return "Error: Access denied. You can only access files within the project directory.";
    }
    const files = await fsPromises.readdir(resolvedPath, { withFileTypes: true });
    return files.map(file => file.isDirectory() ? `${file.name}/` : file.name).join('\n');
  } catch (error: any) {
    return `Error listing files: ${error.message}`;
  }
}

export const readFile = async (filePath: string): Promise<string> => {
  try {
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(process.cwd())) {
      return "Error: Access denied. You can only access files within the project directory.";
    }
    return await fsPromises.readFile(resolvedPath, 'utf-8');
  } catch (error: any) {
    return `Error reading file: ${error.message}`;
  }
}

export const google_search = async (query: string): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || '017576662512468239146:omuauf_lfve'; // Default search engine ID

    if (!apiKey) {
      return 'Error: Google API key not found in environment variables';
    }

    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google Search API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return `No search results found for "${query}"`;
    }

    const results = data.items.slice(0, 5).map((item: any, index: number) => {
      return `${index + 1}. ${item.title}\n   ${item.snippet}\n   ${item.link}\n`;
    }).join('\n');

    return `Search results for "${query}":\n\n${results}`;
  } catch (error: any) {
    return `Error performing Google search: ${error.message}`;
  }
}

export const view_text_website = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
  } catch (error: any) {
    return `Error reading website: ${error.message}`;
  }
}
