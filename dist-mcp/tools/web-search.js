"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.web_search_structured = web_search_structured;
exports.web_search = web_search;
const node_fetch_1 = __importDefault(require("node-fetch"));
const url_extraction_1 = require("../utils/url-extraction");
async function fetchPageContent(url) {
    try {
        const response = await (0, node_fetch_1.default)(url);
        if (!response.ok) {
            console.warn(`[Web Search] Failed to fetch ${url}: HTTP ${response.status}`);
            return { content: '', success: false };
        }
        const text = await response.text();
        const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        return { content: cleanText.substring(0, 1000), success: true };
    }
    catch (error) {
        console.warn(`[Web Search] Failed to fetch ${url}: ${error.message}`);
        return { content: '', success: false };
    }
}
async function web_search_structured(query, model) {
    try {
        console.log(`[Web Search] Performing structured search for: "${query}"`);
        const searchQuery = (0, url_extraction_1.createCreatorSearchQuery)(query);
        console.log(`[Web Search] Using optimized query: "${searchQuery}"`);
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
        const structuredData = (0, url_extraction_1.processWebSearchResults)(query, urls);
        console.log(`[Web Search] Extracted structured data:`, {
            youtube: !!structuredData.youtube_channel_url,
            twitch: !!structuredData.twitch_channel_url,
            additional: structuredData.additional_links.length,
            sources: structuredData.extraction_metadata.sources_found
        });
        return structuredData;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('[Web Search] Error during structured search:', errorMessage);
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
async function web_search(query, model) {
    try {
        console.log(`[Web Search] Legacy search for: "${query}"`);
        const structuredData = await web_search_structured(query, model);
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
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('[Web Search] Error during legacy search:', errorMessage);
        return `Search temporarily unavailable. Please try again later.`;
    }
}
