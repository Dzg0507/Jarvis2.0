import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import fetch from 'node-fetch';
import { processWebSearchResults, createCreatorSearchQuery, WebSearchContent } from '../utils/url-extraction';

// Legacy function for backward compatibility - now returns error info internally
async function fetchPageContent(url: string): Promise<{ content: string; success: boolean }> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.warn(`[Web Search] Failed to fetch ${url}: HTTP ${response.status}`);
            return { content: '', success: false };
        }

        const text = await response.text();
        // Simple HTML tag removal - this content is no longer exposed to client
        const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        return { content: cleanText.substring(0, 1000), success: true }; // Limit for internal processing
    } catch (error: any) {
        console.warn(`[Web Search] Failed to fetch ${url}: ${error.message}`);
        return { content: '', success: false };
    }
}

/**
 * Enhanced web search that returns structured data instead of raw content
 * @param query The search query.
 * @param model The GenerativeModel instance to use for URL generation.
 * @returns Structured web search content as JSON string
 */
export async function web_search_structured(query: string, model: GenerativeModel): Promise<WebSearchContent> {
    try {
        console.log(`[Web Search] Performing structured search for: "${query}"`);

        // Step 1: Generate creator-focused search query
        const searchQuery = createCreatorSearchQuery(query);
        console.log(`[Web Search] Using optimized query: "${searchQuery}"`);

        // Step 2: Ask AI to generate relevant URLs
        const urlGenerationPrompt = `You are a search engine assistant. For the query "${searchQuery}", provide a newline-separated list of 3-5 highly relevant URLs that would contain creator channels or video content. Focus on:
- YouTube channel URLs (youtube.com/@username, youtube.com/c/channelname)
- Twitch channel URLs (twitch.tv/username)
- YouTube search results pages
- Reddit discussions about the creator

Output ONLY the URLs, one per line.`;

        const urlResult = await model.generateContent(urlGenerationPrompt);
        const urlResponse = await urlResult.response;
        const urlsText = urlResponse.text();
        const urls = urlsText.split('\n')
            .map(url => url.trim())
            .filter(url => url.startsWith('http'));

        console.log(`[Web Search] AI suggested URLs:`, urls);

        // Step 3: Process URLs to extract structured data
        const structuredData = processWebSearchResults(query, urls);

        console.log(`[Web Search] Extracted structured data:`, {
            youtube: !!structuredData.youtube_channel_url,
            twitch: !!structuredData.twitch_channel_url,
            additional: structuredData.additional_links.length,
            sources: structuredData.extraction_metadata.sources_found
        });

        return structuredData;

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('[Web Search] Error during structured search:', errorMessage);

        // Return empty structure on error - no error messages leak to client
        return {
            youtube_channel_url: null,
            twitch_channel_url: null,
            additional_links: [],
            extraction_metadata: {
                sources_found: 0,
                extraction_successful: false
            }
        };
    }
}

/**
 * Legacy web search function - maintained for backward compatibility
 * @deprecated Use web_search_structured for new implementations
 */
export async function web_search(query: string, model: GenerativeModel): Promise<string> {
    try {
        console.log(`[Web Search] Legacy search for: "${query}"`);

        // Use structured search and convert to legacy format
        const structuredData = await web_search_structured(query, model);

        // Convert structured data to legacy text format for backward compatibility
        let legacyContent = `Web search results for "${query}":\n\n`;

        if (structuredData.youtube_channel_url) {
            legacyContent += `--- YouTube Channel ---\n${structuredData.youtube_channel_url}\n\n`;
        }

        if (structuredData.twitch_channel_url) {
            legacyContent += `--- Twitch Channel ---\n${structuredData.twitch_channel_url}\n\n`;
        }

        if (structuredData.additional_links.length > 0) {
            legacyContent += `--- Additional Links ---\n`;
            structuredData.additional_links.forEach((link, index) => {
                legacyContent += `${index + 1}. ${link}\n`;
            });
        }

        if (structuredData.extraction_metadata.sources_found === 0) {
            legacyContent += `No relevant creator channels found for "${query}".`;
        }

        return legacyContent;

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('[Web Search] Error during legacy search:', errorMessage);
        return `Search temporarily unavailable. Please try again later.`;
    }
}
