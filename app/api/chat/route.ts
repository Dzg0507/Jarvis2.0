import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, ChatSession } from "@google/generative-ai";
import { getDynamicJarvisContext, callTool } from '../../../src/chat/mcp-client';
import { config } from '../../../src/config';
import { longFetch } from '../../../src/utils/long-fetch';
import {
    classifyVideoSearchIntent,
    calculateSpecificIntentRelevance,
    shouldTriggerFallback,
    type IntentAnalysisResult,
    type VideoSearchIntent
} from '../../../src/utils/intent-classification';

// Next.js route configuration
export const dynamic = 'force-dynamic'; // Ensures this route is not statically optimized
export const maxDuration = 1200; // 20 minutes timeout for image generation
export const revalidate = 0; // Disable caching completely

const MCP_SERVER_URL = config.mcp.serverUrl;

if (!config.ai.apiKey) {
    throw new Error("API_KEY environment variable not set");
}
const genAI = new GoogleGenerativeAI(config.ai.apiKey);
const model = genAI.getGenerativeModel({ model: config.ai.modelName as string });

let chat: ChatSession | null = null;
let dynamicToolsContext: string | null = null;
let currentPersonaPrompt: string | null = null;
let toolContextPromise: Promise<string> | null = null;
let isInitializing = false;

// Initialize tool context with proper promise handling
async function initializeToolContext(): Promise<string> {
    if (dynamicToolsContext) {
        return dynamicToolsContext;
    }

    if (toolContextPromise) {
        return toolContextPromise;
    }

    if (isInitializing) {
        // Wait for ongoing initialization
        return new Promise((resolve, reject) => {
            const checkInterval = setInterval(() => {
                if (dynamicToolsContext) {
                    clearInterval(checkInterval);
                    resolve(dynamicToolsContext);
                } else if (!isInitializing) {
                    clearInterval(checkInterval);
                    reject(new Error('Tool context initialization failed'));
                }
            }, 100);

            // Timeout after 30 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                reject(new Error('Tool context initialization timeout'));
            }, 30000);
        });
    }

    isInitializing = true;
    console.log('[API Chat] Starting tool context initialization...');

    toolContextPromise = getDynamicJarvisContext()
        .then((context: string) => {
            dynamicToolsContext = context;
            isInitializing = false;
            console.log('[API Chat] Tool context loaded successfully.');
            return context;
        })
        .catch((error) => {
            isInitializing = false;
            console.error('[API Chat] Failed to load tool context:', error);
            throw error;
        });

    return toolContextPromise;
}

// Wait for tool context with retry logic
async function waitForToolContext(maxRetries: number = 3, retryDelay: number = 2000): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[API Chat] Tool context initialization attempt ${attempt}/${maxRetries}`);
            const context = await initializeToolContext();
            console.log(`[API Chat] Tool context ready after ${attempt} attempt(s)`);
            return context;
        } catch (error) {
            lastError = error as Error;
            console.warn(`[API Chat] Tool context attempt ${attempt} failed:`, error);

            if (attempt < maxRetries) {
                console.log(`[API Chat] Retrying in ${retryDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                // Exponential backoff
                retryDelay *= 1.5;
            }
        }
    }

    throw new Error(`Tool context initialization failed after ${maxRetries} attempts. Last error: ${lastError?.message}`);
}

// Sanitize raw arguments before parsing
function sanitizeToolArguments(rawArgs: string): string {
    if (!rawArgs) return '';

    let sanitized = rawArgs.trim();

    // Remove common problematic characters at start/end
    sanitized = sanitized.replace(/^[,\s]+|[,\s]+$/g, '');

    // Fix common JSON formatting issues
    sanitized = sanitized
        // Fix unquoted keys: key: value -> "key": value
        .replace(/(\w+)(\s*:\s*)/g, '"$1"$2')
        // Fix single quotes: 'value' -> "value"
        .replace(/'/g, '"')
        // Fix trailing commas: , } -> }
        .replace(/,(\s*[}\]])/g, '$1')
        // Fix missing commas between properties: "a":"b" "c":"d" -> "a":"b", "c":"d"
        .replace(/("\s*)\s+"/g, '$1, "')
        // Remove duplicate commas
        .replace(/,+/g, ',');

    return sanitized;
}

// Robust tool argument parser with multiple fallback strategies
function parseToolArguments(toolName: string, rawArgs: string): any {
    console.log(`[API Chat] Parsing arguments for ${toolName}: "${rawArgs}"`);

    // Sanitize the raw arguments first
    const cleanArgs = sanitizeToolArguments(rawArgs);

    // Strategy 1: Handle empty arguments
    if (!cleanArgs) {
        console.log(`[API Chat] Empty arguments for ${toolName}, using default parameters`);
        return getDefaultToolArgs(toolName);
    }

    // Strategy 2: Try parsing as complete JSON object (already wrapped in {})
    if (cleanArgs.startsWith('{') && cleanArgs.endsWith('}')) {
        try {
            const parsed = JSON.parse(cleanArgs);
            console.log(`[API Chat] Successfully parsed as complete JSON object:`, parsed);
            return parsed;
        } catch (error) {
            console.warn(`[API Chat] Failed to parse as complete JSON object:`, error);
        }
    }

    // Strategy 3: Try parsing as JSON properties (need to wrap in {})
    try {
        const wrappedJson = `{${cleanArgs}}`;
        const parsed = JSON.parse(wrappedJson);
        console.log(`[API Chat] Successfully parsed as JSON properties:`, parsed);
        return parsed;
    } catch (error) {
        console.warn(`[API Chat] Failed to parse as JSON properties:`, error);
    }

    // Strategy 4: Try parsing as key-value pairs
    const kvParsed = parseKeyValuePairs(cleanArgs);
    if (kvParsed && Object.keys(kvParsed).length > 0) {
        console.log(`[API Chat] Successfully parsed as key-value pairs:`, kvParsed);
        return kvParsed;
    }

    // Strategy 5: Tool-specific parsing
    const toolSpecific = parseToolSpecificFormat(toolName, cleanArgs);
    if (toolSpecific) {
        console.log(`[API Chat] Successfully parsed with tool-specific format:`, toolSpecific);
        return toolSpecific;
    }

    // Strategy 6: Fallback - treat as single parameter
    console.warn(`[API Chat] All parsing strategies failed, using fallback for ${toolName}`);
    return getFallbackToolArgs(toolName, cleanArgs);
}

// Parse key-value pairs from various formats
function parseKeyValuePairs(args: string): any | null {
    try {
        const result: any = {};

        // Handle different key-value formats
        const patterns = [
            // Format: key: "value", key2: "value2"
            /(\w+):\s*"([^"]*?)"/g,
            // Format: key: 'value', key2: 'value2'
            /(\w+):\s*'([^']*?)'/g,
            // Format: key: value, key2: value2 (unquoted)
            /(\w+):\s*([^,}\s]+)/g,
            // Format: "key": "value", "key2": "value2"
            /"(\w+)":\s*"([^"]*?)"/g,
        ];

        let hasMatches = false;
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(args)) !== null) {
                result[match[1]] = match[2];
                hasMatches = true;
            }
            // Reset regex lastIndex for next pattern
            pattern.lastIndex = 0;
        }

        return hasMatches ? result : null;
    } catch (error) {
        console.warn(`[API Chat] Key-value parsing failed:`, error);
        return null;
    }
}

// Tool-specific argument parsing
function parseToolSpecificFormat(toolName: string, args: string): any | null {
    switch (toolName.toLowerCase()) {
        case 'video_search':
            // Handle video_search specific formats
            if (args.includes('query')) {
                // Already has query parameter
                return null; // Let other parsers handle it
            } else {
                // Treat entire args as query
                return { query: args.replace(/['"]/g, '') };
            }

        case 'web_search':
        case 'web_read':
            // Handle web tools
            if (!args.includes('url') && !args.includes('query')) {
                return { query: args.replace(/['"]/g, '') };
            }
            break;

        case 'fs_read':
        case 'fs_create':
            // Handle file system tools
            if (!args.includes('path') && !args.includes('filename')) {
                return { path: args.replace(/['"]/g, '') };
            }
            break;

        case 'calculator':
            // Handle calculator
            if (!args.includes('expression')) {
                return { expression: args.replace(/['"]/g, '') };
            }
            break;
    }

    return null;
}

// Get default arguments for tools
function getDefaultToolArgs(toolName: string): any {
    const defaults: { [key: string]: any } = {
        video_search: { query: "default search" },
        web_search: { query: "default search" },
        web_read: { url: "" },
        calculator: { expression: "1+1" },
        fs_read: { path: "" },
        fs_create: { path: "", content: "" },
        get_current_datetime: {},
        save_note: { content: "", tags: [] },
        read_notes: { query: "" }
    };

    return defaults[toolName.toLowerCase()] || {};
}

// Fallback argument parsing
function getFallbackToolArgs(toolName: string, rawArgs: string): any {
    // Clean the arguments
    const cleanedArgs = rawArgs.replace(/['"]/g, '').trim();

    // Tool-specific fallbacks
    switch (toolName.toLowerCase()) {
        case 'video_search':
        case 'web_search':
            return { query: cleanedArgs || "search query" };

        case 'web_read':
            return { url: cleanedArgs || "" };

        case 'calculator':
            return { expression: cleanedArgs || "1+1" };

        case 'fs_read':
            return { path: cleanedArgs || "" };

        case 'fs_create':
            return { path: cleanedArgs || "", content: "" };

        case 'save_note':
            return { content: cleanedArgs || "", tags: [] };

        case 'read_notes':
            return { query: cleanedArgs || "" };

        default:
            // Generic fallback
            if (cleanedArgs) {
                return { input: cleanedArgs };
            }
            return {};
    }
}

// Validate tool arguments
function validateToolArguments(toolName: string, args: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!args || typeof args !== 'object') {
        errors.push('Arguments must be an object');
        return { isValid: false, errors };
    }

    // Tool-specific validation
    switch (toolName.toLowerCase()) {
        case 'video_search':
        case 'web_search':
            if (!args.query || typeof args.query !== 'string') {
                errors.push('Missing or invalid "query" parameter (must be a string)');
            } else if (args.query.trim().length === 0) {
                errors.push('Query parameter cannot be empty');
            }
            break;

        case 'web_read':
            if (!args.url || typeof args.url !== 'string') {
                errors.push('Missing or invalid "url" parameter (must be a string)');
            } else if (!args.url.startsWith('http')) {
                errors.push('URL must start with http:// or https://');
            }
            break;

        case 'calculator':
            if (!args.expression || typeof args.expression !== 'string') {
                errors.push('Missing or invalid "expression" parameter (must be a string)');
            }
            break;

        case 'fs_read':
        case 'fs_create':
            if (!args.path || typeof args.path !== 'string') {
                errors.push('Missing or invalid "path" parameter (must be a string)');
            }
            break;

        case 'save_note':
            if (!args.content || typeof args.content !== 'string') {
                errors.push('Missing or invalid "content" parameter (must be a string)');
            }
            break;
    }

    return { isValid: errors.length === 0, errors };
}

// Fix common argument issues
function fixCommonArgumentIssues(toolName: string, args: any): any {
    if (!args || typeof args !== 'object') {
        return getDefaultToolArgs(toolName);
    }

    const fixed = { ...args };

    // Fix common issues based on tool type
    switch (toolName.toLowerCase()) {
        case 'video_search':
        case 'web_search':
            // Fix query parameter
            if (!fixed.query || typeof fixed.query !== 'string') {
                // Look for alternative parameter names
                fixed.query = fixed.q || fixed.search || fixed.term || 'default search';
            }
            // Clean up query
            if (typeof fixed.query === 'string') {
                fixed.query = fixed.query.trim();
                if (fixed.query.length === 0) {
                    fixed.query = 'default search';
                }
            }
            break;

        case 'web_read':
            // Fix URL parameter
            if (!fixed.url || typeof fixed.url !== 'string') {
                fixed.url = fixed.link || fixed.address || '';
            }
            // Add protocol if missing
            if (fixed.url && !fixed.url.startsWith('http')) {
                fixed.url = 'https://' + fixed.url;
            }
            break;

        case 'calculator':
            // Fix expression parameter
            if (!fixed.expression || typeof fixed.expression !== 'string') {
                fixed.expression = fixed.expr || fixed.calc || fixed.formula || '1+1';
            }
            break;

        case 'fs_read':
        case 'fs_create':
            // Fix path parameter
            if (!fixed.path || typeof fixed.path !== 'string') {
                fixed.path = fixed.file || fixed.filename || '';
            }
            break;

        case 'save_note':
            // Fix content parameter
            if (!fixed.content || typeof fixed.content !== 'string') {
                fixed.content = fixed.text || fixed.note || '';
            }
            // Ensure tags is an array
            if (!Array.isArray(fixed.tags)) {
                fixed.tags = [];
            }
            break;
    }

    return fixed;
}

// Video query detection for intelligent tool selection
function detectVideoQuery(userPrompt: string): { isVideoQuery: boolean; confidence: number; suggestedQuery: string } {
    const prompt = userPrompt.toLowerCase();

    // High-confidence video keywords
    const highConfidenceKeywords = [
        'video', 'videos', 'watch', 'youtube', 'tutorial', 'tutorials',
        'show me', 'find videos', 'search for videos', 'video about',
        'clips', 'movies', 'documentary', 'documentaries', 'stream',
        'vlog', 'vlogs', 'channel', 'channels', 'demonstration'
    ];

    // Medium-confidence video phrases
    const mediumConfidencePhrases = [
        'how to', 'learn about', 'guide to', 'introduction to',
        'course on', 'lesson on', 'training on', 'walkthrough'
    ];

    // Video-related action words
    const videoActions = [
        'show me', 'find', 'search for', 'look for', 'get me',
        'i want to watch', 'i want to see', 'can you find'
    ];

    let confidence = 0;
    let isVideoQuery = false;

    // Check for high-confidence keywords
    for (const keyword of highConfidenceKeywords) {
        if (prompt.includes(keyword)) {
            confidence += keyword === 'video' || keyword === 'videos' ? 0.8 : 0.6;
            isVideoQuery = true;
        }
    }

    // Check for medium-confidence phrases combined with learning topics
    for (const phrase of mediumConfidencePhrases) {
        if (prompt.includes(phrase)) {
            confidence += 0.4;
            // If it's a "how to" or learning request, it's likely video content
            if (phrase === 'how to' || phrase === 'learn about') {
                confidence += 0.3;
                isVideoQuery = true;
            }
        }
    }

    // Check for video action patterns
    for (const action of videoActions) {
        if (prompt.includes(action)) {
            confidence += 0.3;
            // If action is followed by learning/tutorial terms, boost confidence
            if (prompt.includes(action + ' tutorial') || prompt.includes(action + ' video')) {
                confidence += 0.4;
                isVideoQuery = true;
            }
        }
    }

    // Educational/tutorial context detection
    const educationalTerms = [
        'programming', 'coding', 'development', 'tutorial', 'course',
        'lesson', 'training', 'guide', 'walkthrough', 'demo', 'example'
    ];

    let hasEducationalContext = false;
    for (const term of educationalTerms) {
        if (prompt.includes(term)) {
            hasEducationalContext = true;
            confidence += 0.2;
            break;
        }
    }

    // If educational context + action words, likely video request
    if (hasEducationalContext && videoActions.some(action => prompt.includes(action))) {
        confidence += 0.3;
        isVideoQuery = true;
    }

    // Normalize confidence to 0-1 range
    confidence = Math.min(confidence, 1.0);

    // Generate suggested query with improved cleaning and creator-specific optimization
    let suggestedQuery = userPrompt
        .replace(/^(show me|find|search for|look for|get me|i want to watch|i want to see|can you find)\s+/i, '')
        .replace(/\s*(video|videos)\s+(about|of|on)\s+/i, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // Detect creator-specific queries and optimize for better discovery
    const creatorPattern = /\b(by|from|created by|made by)\s+(\w+)/i;
    const creatorMatch = suggestedQuery.match(creatorPattern);

    if (creatorMatch) {
        const creatorName = creatorMatch[2];
        // Optimize for creator discovery
        suggestedQuery = `${creatorName} ${suggestedQuery.replace(creatorPattern, '').trim()}`;

        // Add creator-specific terms for better targeting
        if (!suggestedQuery.toLowerCase().includes('channel') &&
            !suggestedQuery.toLowerCase().includes('creator')) {
            suggestedQuery += ' channel';
        }
    }

    // If the query doesn't contain "video" or "tutorial", add appropriate suffix
    if (!suggestedQuery.toLowerCase().includes('video') &&
        !suggestedQuery.toLowerCase().includes('tutorial') &&
        hasEducationalContext) {
        suggestedQuery += ' tutorial';
    }

    return {
        isVideoQuery: isVideoQuery || confidence > 0.5,
        confidence,
        suggestedQuery: suggestedQuery || userPrompt
    };
}

// Enhanced thumbnail URL generation for better quality
function enhanceThumbnailUrl(originalThumbnail: string, videoUrl: string): string {
    // Extract video ID for better thumbnail if it's a YouTube video
    if (videoUrl.includes('youtube.com/watch?v=') || videoUrl.includes('youtu.be/')) {
        const videoId = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
        if (videoId) {
            return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        }
    }
    return originalThumbnail || 'https://via.placeholder.com/320x180?text=No+Thumbnail';
}

// Detect video platform from URL
function detectVideoPlatform(url: string): string {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        return 'YouTube';
    } else if (url.includes('twitch.tv')) {
        return 'Twitch';
    } else if (url.includes('vimeo.com')) {
        return 'Vimeo';
    } else {
        return 'Video';
    }
}



// Structured web search content interface
interface WebSearchContent {
    youtube_channel_url: string | null;
    twitch_channel_url: string | null;
    additional_links: string[];
    extraction_metadata: {
        sources_found: number;
        extraction_successful: boolean;
    };
}

// Create structured JSON data for video search results
function createVideoSearchResponse(
    videoData: any[],
    originalQuery: string = '',
    searchMetadata: any = {},
    webSearchContent: WebSearchContent | null = null
): any {
    // Categorize results by creator relevance
    const creatorVideos: any[] = [];
    const relatedVideos: any[] = [];

    videoData.forEach((video: any) => {
        if (video.title && video.url) {
            const title = video.title.toLowerCase();
            // Check if this is likely creator-specific content
            const isCreatorContent = title.includes('stevie') || title.includes('ft.') || title.includes('featuring');

            const processedVideo = {
                title: video.title,
                video_url: video.url,
                thumbnail_url: enhanceThumbnailUrl(video.thumbnail, video.url),
                platform: detectVideoPlatform(video.url),
                is_creator_content: isCreatorContent,
                description: video.description || null,
                duration: video.duration || null,
                view_count: video.view_count || null
            };

            if (isCreatorContent) {
                creatorVideos.push(processedVideo);
            } else {
                relatedVideos.push(processedVideo);
            }
        }
    });

    // Combine results with creator videos first
    const allVideos = [
        ...creatorVideos.slice(0, 5),
        ...relatedVideos.slice(0, Math.max(0, 10 - creatorVideos.length))
    ];

    return {
        response_type: "video_search_results",
        content_type: "json",
        data: {
            query: originalQuery,
            total_results: allVideos.length,
            creator_results_count: creatorVideos.length,
            items: allVideos,
            search_metadata: {
                primary_search_successful: searchMetadata.primary_search_successful !== false,
                fallback_search_used: searchMetadata.fallback_search_used || false,
                web_search_supplemented: searchMetadata.web_search_supplemented || false
            },
            web_search_content: webSearchContent || {
                youtube_channel_url: null,
                twitch_channel_url: null,
                additional_links: [],
                extraction_metadata: {
                    sources_found: 0,
                    extraction_successful: false
                }
            }
        }
    };
}

// Format video search results as structured JSON data
function formatVideoResults(toolResult: any, toolName: string): string {
    if (toolName !== 'video_search' || !toolResult?.content?.[0]?.text) {
        return JSON.stringify(toolResult);
    }

    try {
        const videoData = JSON.parse(toolResult.content[0].text);
        if (!Array.isArray(videoData)) {
            return JSON.stringify(toolResult);
        }

        const jsonResponse = createVideoSearchResponse(videoData, '', {
            primary_search_successful: true,
            fallback_search_used: false,
            web_search_supplemented: false
        });

        return JSON.stringify(jsonResponse);
    } catch (error) {
        console.warn('[API Chat] Failed to format video results:', error);
        return JSON.stringify(toolResult);
    }
}

// Format video results from raw data array as structured JSON
function formatVideoResultsFromData(
    videoData: any[],
    originalQuery: string = '',
    searchMetadata: any = {},
    webSearchContent: WebSearchContent | null = null
): string {
    if (!Array.isArray(videoData) || videoData.length === 0) {
        const emptyResponse = {
            response_type: "video_search_results",
            content_type: "json",
            data: {
                query: originalQuery,
                total_results: 0,
                creator_results_count: 0,
                items: [],
                search_metadata: {
                    primary_search_successful: false,
                    fallback_search_used: false,
                    web_search_supplemented: false
                },
                web_search_content: {
                    youtube_channel_url: null,
                    twitch_channel_url: null,
                    additional_links: [],
                    extraction_metadata: {
                        sources_found: 0,
                        extraction_successful: false
                    }
                }
            }
        };
        return JSON.stringify(emptyResponse);
    }

    const jsonResponse = createVideoSearchResponse(videoData, originalQuery, searchMetadata, webSearchContent);
    return JSON.stringify(jsonResponse);
}

// Content type detection for tool results
interface ProcessedToolResult {
    content: string;
    contentType: 'text' | 'html' | 'json';
    isVideoResult: boolean;
}

// Enhanced tool result processing with content type detection
function processToolResult(toolResult: any, toolName: string): ProcessedToolResult {
    // Special formatting for video search results
    if (toolName === 'video_search') {
        const jsonContent = formatVideoResults(toolResult, toolName);
        return {
            content: jsonContent,
            contentType: 'json',
            isVideoResult: true
        };
    }

    // Standard formatting for other tools
    return {
        content: JSON.stringify(toolResult),
        contentType: 'text',
        isVideoResult: false
    };
}

// Legacy function for backward compatibility
function processToolResultAsString(toolResult: any, toolName: string): string {
    const processed = processToolResult(toolResult, toolName);
    return processed.content;
}

// Enhanced relevance assessment with intent-based scoring
function assessVideoSearchRelevance(toolResult: any, originalQuery: string, intent: VideoSearchIntent): number {
    if (!toolResult?.content?.[0]?.text) {
        return 0;
    }

    try {
        const videoData = JSON.parse(toolResult.content[0].text);
        if (!Array.isArray(videoData) || videoData.length === 0) {
            return 0;
        }

        if (intent === 'specific') {
            // Use enhanced relevance scoring for specific queries
            return calculateSpecificIntentRelevance(videoData, originalQuery);
        } else {
            // For general queries, use simplified creator-based relevance
            const creatorMatch = originalQuery.match(/\b(by|from|created by|made by)\s+(\w+)/i) ||
                               originalQuery.match(/\b(\w+)\s+(channel|creator|videos)/i);

            if (!creatorMatch) {
                // If no specific creator mentioned, assume general relevance is adequate
                return 0.8; // High relevance for general queries
            }

            const creatorName = creatorMatch[2] || creatorMatch[1];
            let relevantCount = 0;

            // Check how many results mention the creator
            for (const video of videoData) {
                const title = (video.title || '').toLowerCase();
                const url = (video.url || '').toLowerCase();

                if (title.includes(creatorName.toLowerCase()) ||
                    url.includes(creatorName.toLowerCase()) ||
                    title.includes(`ft. ${creatorName.toLowerCase()}`) ||
                    title.includes(`featuring ${creatorName.toLowerCase()}`)) {
                    relevantCount++;
                }
            }

            return relevantCount / videoData.length;
        }
    } catch (error) {
        console.warn('[API Chat] Failed to assess video search relevance:', error);
        return 0;
    }
}

// Generate enhanced creator-specific search query
function generateEnhancedCreatorQuery(originalQuery: string): string {
    const creatorMatch = originalQuery.match(/\b(by|from|created by|made by)\s+(\w+)/i);

    if (!creatorMatch) {
        return originalQuery;
    }

    const creatorName = creatorMatch[2];
    const baseContent = originalQuery.replace(creatorMatch[0], '').trim();

    // Generate multiple search strategies
    const strategies = [
        `"${creatorName}" ${baseContent}`, // Exact creator name match
        `${creatorName} channel ${baseContent}`, // Channel-specific search
        `${creatorName} gaming ${baseContent}`, // Gaming context
        `${creatorName} youtube ${baseContent}` // Platform-specific
    ];

    // Return the most specific strategy
    return strategies[0];
}

// Check if video search results are insufficient
function isVideoResultInsufficient(toolResult: any): boolean {
    if (!toolResult?.content?.[0]?.text) {
        return true;
    }

    try {
        const videoData = JSON.parse(toolResult.content[0].text);
        if (!Array.isArray(videoData)) {
            return true;
        }

        // Consider insufficient if less than 3 results
        return videoData.length < 3;
    } catch (error) {
        return true;
    }
}

// Smart intent-based video search with selective fallback logic
async function handleVideoSearchWithFallback(toolName: string, toolArgs: any, originalQuery: string): Promise<{ result: any; usedFallback: boolean; fallbackResult?: any }> {
    try {
        // STEP 1: Classify user intent before any search execution
        const intentAnalysis = classifyVideoSearchIntent(originalQuery);
        console.log(`[API Chat] Intent Analysis - Type: ${intentAnalysis.intent}, Confidence: ${(intentAnalysis.confidence * 100).toFixed(1)}%`);
        console.log(`[API Chat] Intent Reasoning: ${intentAnalysis.reasoning}`);
        console.log(`[API Chat] Intent Indicators: [${intentAnalysis.indicators.join(', ')}]`);

        console.log(`[API Chat] Attempting primary video search with query: "${toolArgs.query}"`);

        // STEP 2: Execute primary video search
        const primaryResult = await callTool(toolName, toolArgs);

        // STEP 3: Apply intent-based fallback decision logic
        if (!isVideoResultInsufficient(primaryResult)) {
            const resultCount = primaryResult?.content?.[0]?.text ? JSON.parse(primaryResult.content[0].text).length : 0;
            console.log(`[API Chat] Video search successful with ${resultCount} results`);

            if (intentAnalysis.intent === 'general') {
                // For general queries, ALWAYS return results immediately (no fallback)
                console.log(`[API Chat] General intent detected - returning ${resultCount} results without fallback`);
                return { result: primaryResult, usedFallback: false };
            } else {
                // For specific queries, evaluate relevance before deciding on fallback
                const relevanceScore = assessVideoSearchRelevance(primaryResult, originalQuery, intentAnalysis.intent);
                console.log(`[API Chat] Specific intent relevance score: ${(relevanceScore * 100).toFixed(1)}%`);

                if (!shouldTriggerFallback(intentAnalysis.intent, relevanceScore)) {
                    console.log(`[API Chat] Specific query has adequate relevance (${(relevanceScore * 100).toFixed(1)}%) - skipping fallback`);
                    return { result: primaryResult, usedFallback: false };
                }

                console.log(`[API Chat] Specific query has poor relevance (${(relevanceScore * 100).toFixed(1)}%) - fallback may be needed`);
            }
        }

        // STEP 4: For specific queries with poor relevance, try enhanced search before fallback
        if (intentAnalysis.intent === 'specific') {
            const enhancedQuery = generateEnhancedCreatorQuery(originalQuery);
            if (enhancedQuery !== toolArgs.query) {
                console.log(`[API Chat] Trying enhanced creator search for specific query: "${enhancedQuery}"`);
                const enhancedArgs = { ...toolArgs, query: enhancedQuery };
                const enhancedResult = await callTool(toolName, enhancedArgs);

                if (!isVideoResultInsufficient(enhancedResult)) {
                    const enhancedRelevance = assessVideoSearchRelevance(enhancedResult, originalQuery, intentAnalysis.intent);
                    const primaryRelevance = assessVideoSearchRelevance(primaryResult, originalQuery, intentAnalysis.intent);

                    if (enhancedRelevance > primaryRelevance) {
                        console.log(`[API Chat] Enhanced search improved relevance to ${(enhancedRelevance * 100).toFixed(1)}%`);

                        // Check if enhanced results are good enough to skip fallback
                        if (!shouldTriggerFallback(intentAnalysis.intent, enhancedRelevance)) {
                            console.log(`[API Chat] Enhanced search results are adequate - skipping fallback`);
                            return { result: enhancedResult, usedFallback: false };
                        }
                    }
                }
            }
        }

        // STEP 5: Only trigger web search fallback for specific queries with poor relevance
        if (intentAnalysis.intent === 'general') {
            console.log(`[API Chat] General intent query - fallback prohibited, returning primary results`);
            return { result: primaryResult, usedFallback: false };
        }

        console.log(`[API Chat] Specific query with poor relevance - triggering structured web search fallback...`);

        // Strategy 3: Structured web search fallback with platform targeting
        const webSearchArgs = { query: `${originalQuery} site:youtube.com OR site:twitch.tv` };
        const fallbackResult = await callTool('web_search', webSearchArgs);

        // Extract structured data from web search results instead of raw content
        let structuredWebContent: WebSearchContent | null = null;
        try {
            // Extract URLs from the fallback result if available
            const webSearchText = fallbackResult?.content?.[0]?.text || '';
            const urlMatches = webSearchText.match(/https?:\/\/[^\s]+/g) || [];

            // Process URLs to extract channel information
            let youtubeChannel: string | null = null;
            let twitchChannel: string | null = null;
            const additionalLinks: string[] = [];

            for (const url of urlMatches) {
                try {
                    const cleanUrl = new URL(url).toString();

                    // Check for YouTube channel patterns
                    if (!youtubeChannel && (cleanUrl.includes('youtube.com/@') || cleanUrl.includes('youtube.com/c/') || cleanUrl.includes('youtube.com/channel/'))) {
                        youtubeChannel = cleanUrl;
                    }
                    // Check for Twitch channel patterns
                    else if (!twitchChannel && cleanUrl.includes('twitch.tv/') && !cleanUrl.includes('/videos') && !cleanUrl.includes('/clips')) {
                        twitchChannel = cleanUrl;
                    }
                    // Add other relevant links
                    else if (additionalLinks.length < 3 && (cleanUrl.includes('youtube.com/results') || cleanUrl.includes('reddit.com'))) {
                        additionalLinks.push(cleanUrl);
                    }
                } catch (urlError) {
                    // Skip invalid URLs
                    continue;
                }
            }

            structuredWebContent = {
                youtube_channel_url: youtubeChannel,
                twitch_channel_url: twitchChannel,
                additional_links: additionalLinks,
                extraction_metadata: {
                    sources_found: [youtubeChannel, twitchChannel].filter(Boolean).length + additionalLinks.length,
                    extraction_successful: youtubeChannel !== null || twitchChannel !== null || additionalLinks.length > 0
                }
            };

            console.log(`[API Chat] Extracted structured web search data:`, {
                youtube: !!structuredWebContent.youtube_channel_url,
                twitch: !!structuredWebContent.twitch_channel_url,
                additional: structuredWebContent.additional_links.length,
                sources: structuredWebContent.extraction_metadata.sources_found
            });
        } catch (error) {
            console.warn('[API Chat] Failed to extract structured web search data:', error);
            structuredWebContent = null;
        }

        // Get the raw video data for proper formatting
        let videoResults: any[] = [];
        try {
            videoResults = primaryResult?.content?.[0]?.text ? JSON.parse(primaryResult.content[0].text) : [];
        } catch (error) {
            console.warn('[API Chat] Failed to parse video results for fallback formatting:', error);
            videoResults = [];
        }

        const searchMetadata = {
            primary_search_successful: true,
            fallback_search_used: true,
            web_search_supplemented: true
        };

        const formattedVideoResults = formatVideoResultsFromData(videoResults, originalQuery, searchMetadata, structuredWebContent);

        // Return the properly formatted JSON response with structured web search content
        const combinedResult = {
            content: [{
                type: 'text',
                text: formattedVideoResults
            }]
        };

        console.log(`[API Chat] Fallback Decision Summary:`);
        console.log(`[API Chat] - Intent: ${intentAnalysis.intent} (${(intentAnalysis.confidence * 100).toFixed(1)}% confidence)`);
        console.log(`[API Chat] - Primary results: ${videoResults.length} videos`);
        console.log(`[API Chat] - Web search sources: ${structuredWebContent?.extraction_metadata.sources_found || 0}`);
        console.log(`[API Chat] - Fallback triggered: YES (specific query with poor relevance)`);
        return { result: combinedResult, usedFallback: true, fallbackResult };

    } catch (error) {
        console.error(`[API Chat] Video search failed completely, using web search fallback:`, error);

        // If video search fails completely, use web search
        const webSearchArgs = { query: `${originalQuery} videos youtube channel` };
        const fallbackResult = await callTool('web_search', webSearchArgs);

        const webFallbackContent = fallbackResult?.content?.[0]?.text || 'No web results found';
        const fallbackOnlyResult = {
            content: [{
                type: 'text',
                text: `⚠️ **Video search encountered an issue. Here are web results for video content:**\n\n${webFallbackContent}\n\n🔄 **Suggestion:** Try rephrasing your search or providing more specific details about the creator.`
            }]
        };

        return { result: fallbackOnlyResult, usedFallback: true, fallbackResult };
    }
}

// Validate message structure for Google Generative AI API
function validateMessageStructure(message: any): boolean {
    if (typeof message === 'string') {
        return true; // SDK will handle string conversion
    }

    if (typeof message === 'object' && message !== null) {
        return Array.isArray(message.parts) && message.parts.length > 0;
    }

    return false;
}

// Create a properly formatted message for Google Generative AI API
function createMessage(content: string): (string | { text: string })[] {
    return [{ text: content }];
}

// Safe message sending with validation and error recovery
async function sendMessageSafely(chatSession: ChatSession, message: string): Promise<any> {
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[API Chat] Sending message safely (attempt ${attempt}/${maxRetries}): "${message.substring(0, 100)}..."`);

            // Validate the chat session
            if (!chatSession) {
                throw new Error('Chat session is null or undefined');
            }

            // Validate message content
            if (!message || typeof message !== 'string' || message.trim().length === 0) {
                throw new Error('Message is empty or invalid');
            }

            // Send the message (SDK handles string to parts conversion)
            const result = await chatSession.sendMessage(message);

            if (!result || !result.response) {
                throw new Error('Invalid response structure from Gemini API');
            }

            console.log(`[API Chat] Message sent successfully on attempt ${attempt}`);
            return result;

        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            console.error(`[API Chat] Error sending message (attempt ${attempt}/${maxRetries}):`, lastError);

            // Check if it's a parts field error
            if (lastError.message.includes('parts field')) {
                console.log('[API Chat] Parts field error detected, attempting recovery...');

                // Try with explicit message structure
                try {
                    const formattedMessage = createMessage(message);
                    console.log('[API Chat] Retrying with formatted message structure:', formattedMessage);
                    const result = await chatSession.sendMessage(formattedMessage);
                    console.log(`[API Chat] Recovery successful on attempt ${attempt}`);
                    return result;
                } catch (retryError) {
                    console.error('[API Chat] Retry with formatted message failed:', retryError);
                    lastError = retryError instanceof Error ? retryError : new Error(String(retryError));
                }
            }

            // If this is the last attempt, throw the error
            if (attempt === maxRetries) {
                break;
            }

            // Wait before retrying (exponential backoff)
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`[API Chat] Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    // All attempts failed
    console.error(`[API Chat] All ${maxRetries} attempts failed. Last error:`, lastError);
    throw lastError || new Error('Unknown error occurred during message sending');
}

// This function creates a new chat session with a specific persona
async function initializeChatWithPersona(personaPrompt: string) {
    console.log('[API Chat] Initializing chat with persona, waiting for tool context...');

    try {
        // Wait for tool context to be available with retry logic
        const toolContext = await waitForToolContext();

        // Combine the selected persona prompt with the tool definitions
        const fullSystemPrompt = `${personaPrompt}\n\n# AVAILABLE REAL TOOLS (USE THEM):\n${toolContext}`;

        // Create chat session with properly formatted history
        const chatHistory = [
            { role: 'user', parts: [{ text: fullSystemPrompt }] },
            { role: 'model', parts: [{ text: "Understood. I am online and ready." }] }
        ];

        console.log('[API Chat] Creating chat session with validated history structure');

        chat = model.startChat({
            history: chatHistory,
            generationConfig: {
                maxOutputTokens: 8192,
                temperature: 0.2,
                topP: 0.9,
                topK: 40
            },
        });

        // Validate the created chat session
        if (!chat) {
            throw new Error('Failed to create chat session');
        }

        currentPersonaPrompt = personaPrompt;
        console.log(`[API Chat] New chat session initialized successfully with persona: "${personaPrompt.substring(0, 50)}..."`);

    } catch (error) {
        console.error('[API Chat] Failed to initialize chat with persona:', error);
        // Reset chat state on failure
        chat = null;
        currentPersonaPrompt = null;
        throw error;
    }
}

// Validate chat session health
function validateChatSession(chatSession: ChatSession | null): boolean {
    if (!chatSession) {
        console.warn('[API Chat] Chat session is null');
        return false;
    }

    try {
        // Basic validation - check if the session has required properties
        // The Google AI SDK doesn't expose internal state, so we do basic checks

        // Check if it's a valid object
        if (typeof chatSession !== 'object') {
            console.warn('[API Chat] Chat session is not an object');
            return false;
        }

        // Check if it has the sendMessage method
        if (typeof chatSession.sendMessage !== 'function') {
            console.warn('[API Chat] Chat session missing sendMessage method');
            return false;
        }

        return true;
    } catch (error) {
        console.warn('[API Chat] Chat session validation failed:', error);
        return false;
    }
}

// Attempt to recover chat session
async function recoverChatSession(personaPrompt: string): Promise<boolean> {
    try {
        console.log('[API Chat] Attempting to recover chat session...');

        // Reset current session
        resetChatSession();

        // Wait a moment for cleanup
        await new Promise(resolve => setTimeout(resolve, 100));

        // Reinitialize with the current persona
        await initializeChatWithPersona(personaPrompt);

        // Validate the new session
        if (validateChatSession(chat)) {
            console.log('[API Chat] Chat session recovery successful');
            return true;
        } else {
            console.error('[API Chat] Chat session recovery failed - validation failed');
            return false;
        }
    } catch (error) {
        console.error('[API Chat] Chat session recovery failed:', error);
        return false;
    }
}

// Reset chat session on critical errors
function resetChatSession(): void {
    console.log('[API Chat] Resetting chat session due to critical error');
    chat = null;
    currentPersonaPrompt = null;
}

// Validate request parameters
function validateRequestParameters(prompt: string, persona?: string): { isValid: boolean; error?: string } {
    if (!prompt || typeof prompt !== 'string') {
        return { isValid: false, error: 'Prompt is required and must be a string' };
    }

    if (prompt.trim().length === 0) {
        return { isValid: false, error: 'Prompt cannot be empty' };
    }

    if (prompt.length > 50000) {
        return { isValid: false, error: 'Prompt is too long (maximum 50,000 characters)' };
    }

    if (persona && typeof persona !== 'string') {
        return { isValid: false, error: 'Persona must be a string if provided' };
    }

    if (persona && persona.length > 10000) {
        return { isValid: false, error: 'Persona is too long (maximum 10,000 characters)' };
    }

    return { isValid: true };
}

export async function POST(req: NextRequest) {
    console.log('[API Chat] Starting chat handler');

    if (!MCP_SERVER_URL) {
        console.error('[API Chat] MCP server URL not configured');
        return NextResponse.json({ error: 'MCP server not configured' }, { status: 500 });
    }

    try {
        const { prompt, persona } = await req.json();

        // Validate request parameters
        const validation = validateRequestParameters(prompt, persona);
        if (!validation.isValid) {
            return NextResponse.json({
                error: validation.error,
                code: 'INVALID_REQUEST_PARAMETERS'
            }, { status: 400 });
        }

        console.log('[API Chat] Checking chat session...');

        // If the chat doesn't exist, or if the persona has changed, re-initialize the chat session
        if (!chat || (persona && persona !== currentPersonaPrompt)) {
            console.log('[API Chat] Initializing chat with persona...');
            const newPersona = persona || 'You are a helpful AI assistant.';

            try {
                await initializeChatWithPersona(newPersona);
                console.log('[API Chat] Chat initialized successfully');
            } catch (error) {
                console.error('[API Chat] Failed to initialize chat:', error);

                // Provide specific error messages based on the error type
                if (error instanceof Error) {
                    if (error.message.includes('Tool context initialization timeout')) {
                        return NextResponse.json({
                            error: 'AI system is taking longer than expected to initialize. Please try again in a moment.',
                            code: 'INITIALIZATION_TIMEOUT',
                            retryAfter: 5
                        }, { status: 503 });
                    } else if (error.message.includes('Tool context initialization failed')) {
                        return NextResponse.json({
                            error: 'AI tools are currently unavailable. Please check system status.',
                            code: 'TOOLS_UNAVAILABLE',
                            retryAfter: 10
                        }, { status: 503 });
                    } else if (error.message.includes('Failed to fetch tools')) {
                        return NextResponse.json({
                            error: 'Unable to connect to AI services. Please try again later.',
                            code: 'SERVICE_UNAVAILABLE',
                            retryAfter: 15
                        }, { status: 503 });
                    }
                }

                return NextResponse.json({
                    error: 'Failed to initialize chat session. Please try again.',
                    code: 'INITIALIZATION_ERROR'
                }, { status: 500 });
            }
        }

        // Validate chat session health
        if (!validateChatSession(chat)) {
            console.error('[API Chat] Chat session validation failed after initialization');

            // Attempt recovery
            const currentPersona = currentPersonaPrompt || 'You are a helpful AI assistant.';
            const recoverySuccessful = await recoverChatSession(currentPersona);

            if (!recoverySuccessful) {
                return NextResponse.json({
                    error: 'Chat session could not be recovered. Please refresh the page and try again.',
                    code: 'CHAT_SESSION_RECOVERY_FAILED'
                }, { status: 503 });
            }

            console.log('[API Chat] Chat session recovered successfully');
        }

        // Detect if this is a video-related query for intelligent guidance
        const videoDetection = detectVideoQuery(prompt);
        let enhancedPrompt = prompt;

        if (videoDetection.isVideoQuery && videoDetection.confidence > 0.7) {
            console.log(`[API Chat] High-confidence video query detected (${(videoDetection.confidence * 100).toFixed(1)}%): "${videoDetection.suggestedQuery}"`);
            // Add video search hint to the prompt
            enhancedPrompt += `\n\n[SYSTEM HINT: This appears to be a video search request. Consider using video_search with query: "${videoDetection.suggestedQuery}"]`;
        } else if (videoDetection.isVideoQuery) {
            console.log(`[API Chat] Possible video query detected (${(videoDetection.confidence * 100).toFixed(1)}%): "${videoDetection.suggestedQuery}"`);
        }

        console.log('[API Chat] Sending message to AI...');
        if (!chat) {
            throw new Error('Chat session is null before sending message');
        }
        const result = await sendMessageSafely(chat, enhancedPrompt);
        const response = result.response;
        let responseText = response.text();

        console.log('[API Chat] AI response received');

        // Check for image generation requests when MCP tools are not available
        const imageGenerationPattern = /(?:generate|create|make|draw).*(?:image|picture|photo|artwork|illustration)/i;
        const hasImageRequest = imageGenerationPattern.test(prompt) || imageGenerationPattern.test(responseText) || prompt.startsWith('/create_image');

        // Check if MCP tools failed to load (more robust detection)
        const mcpToolsFailed = responseText.includes('No tools available') ||
                              responseText.includes('connection error') ||
                              responseText.includes('unable to generate') ||
                              responseText.includes('cannot generate') ||
                              responseText.includes("I can't generate") ||
                              responseText.includes("I'm not able to generate");

        console.log(`[API Chat] Image request check: hasImageRequest=${hasImageRequest}, mcpToolsFailed=${mcpToolsFailed}`);
        console.log(`[API Chat] Response text preview: "${responseText.substring(0, 200)}..."`);

        // Also check if this is clearly an image request but no actual image was generated
        const noImageGenerated = hasImageRequest && !responseText.includes('![') && !responseText.includes('TOOL_CALL:');

        if (hasImageRequest && (mcpToolsFailed || responseText.length < 100 || noImageGenerated)) {
            console.log('[API Chat] Detected image generation request with no MCP tools available, using direct fallback');

            try {
                // Extract prompt for image generation
                const imagePrompt = prompt.replace(/(?:generate|create|make|draw)\s+(?:an?\s+)?(?:image|picture|photo|artwork|illustration)\s+(?:of\s+)?/i, '').trim();

                console.log(`[API Chat] Calling DIRECT image generation with prompt: "${imagePrompt}"`);

                // Call the direct image generation API - bypasses all middleware
                const imageResponse = await longFetch(`${req.nextUrl.origin}/api/create_image`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache',
                    },
                    body: JSON.stringify({
                        query: imagePrompt
                    }),
                    timeoutMs: 20 * 60 * 1000, // 20 minutes
                });

                const imageResult = await imageResponse.json();

                if (imageResult.success && imageResult.image) {
                    console.log(`[API Chat] Image generated successfully using ${imageResult.service_used}`);
                    console.log(`[API Chat] Image debug info:`, imageResult.debug);
                    console.log(`[API Chat] Image timestamp:`, imageResult.timestamp);

                    // Don't add cache-busting to base64 data URLs (it corrupts them)
                    const serverUsed = imageResult.server_used || 'Stable Diffusion';
                    const imageData = imageResult.image;

                    console.log('[API Chat] Image data info:', {
                        length: imageData?.length,
                        isBase64: imageData?.startsWith('data:image/'),
                        serverUsed: serverUsed
                    });

                    // Create a response that includes the image
                    responseText = `I've generated an image for you using ${serverUsed}!\n\n![Generated Image](${imageData})\n\nPrompt: "${imagePrompt}"`;
                } else {
                    console.error('[API Chat] Image generation failed:', imageResult.error);
                    responseText = `I apologize, but I encountered an error while generating the image: ${imageResult.error || 'Unknown error'}. Please make sure the Stable Diffusion server is running or check your OpenAI API configuration.`;
                }
            } catch (imageError) {
                console.error('[API Chat] Direct image generation fallback failed:', imageError);

                // Handle timeout errors specifically
                if (imageError instanceof Error && imageError.name === 'AbortError') {
                    responseText = `I apologize, but the image generation is taking longer than expected (over 20 minutes). This might happen with complex prompts or if the GPU is busy. Please try again with a simpler prompt or wait a moment before retrying.`;
                } else {
                    responseText = `I apologize, but I'm unable to generate images at the moment due to a technical issue. Please try again later or check that the image generation services are properly configured.`;
                }
            }
        }

        // Check if the AI wants to use a tool
        const toolCallMatch = responseText.match(/TOOL_CALL:\s*(\w+)\s*\(([\s\S]*?)\)/);
        if (toolCallMatch) {
            const toolName = toolCallMatch[1];
            const rawArgs = toolCallMatch[2];
            let toolArgs;

            console.log(`[API Chat] Raw tool call detected: ${toolName}(${rawArgs})`);

            // Parse tool arguments with robust error handling
            toolArgs = parseToolArguments(toolName, rawArgs);

            console.log(`[API Chat] Tool call parsed: ${toolName} with args:`, toolArgs);

            try {
                // Validate tool arguments before calling
                const validationResult = validateToolArguments(toolName, toolArgs);
                if (!validationResult.isValid) {
                    console.warn(`[API Chat] Tool arguments validation failed for ${toolName}:`, validationResult.errors);
                    // Try to fix common issues
                    toolArgs = fixCommonArgumentIssues(toolName, toolArgs);
                    console.log(`[API Chat] Attempted to fix arguments:`, toolArgs);
                }

                console.log(`[API Chat] Calling tool ${toolName} with validated args:`, JSON.stringify(toolArgs, null, 2));

                let toolResult;
                let usedFallback = false;

                // Use enhanced video search with fallback for video queries
                if (toolName === 'video_search') {
                    const originalQuery = toolArgs.query || 'video search';
                    const searchResult = await handleVideoSearchWithFallback(toolName, toolArgs, originalQuery);
                    toolResult = searchResult.result;
                    usedFallback = searchResult.usedFallback;

                    if (usedFallback) {
                        console.log('[API Chat] Video search used fallback strategy');
                    }
                } else {
                    // Standard tool execution for non-video tools
                    toolResult = await callTool(toolName, toolArgs);
                }

                console.log('[API Chat] Tool result received:', typeof toolResult === 'object' ? JSON.stringify(toolResult, null, 2) : toolResult);

                // Process the tool result with content type detection
                const processedResult = processToolResult(toolResult, toolName);
                console.log(`[API Chat] Processed result type: ${processedResult.contentType}, isVideo: ${processedResult.isVideoResult}`);

                // Handle JSON video results differently from text results
                if (processedResult.contentType === 'json' && processedResult.isVideoResult) {
                    // For video results, return the JSON directly without AI interpretation
                    console.log('[API Chat] Returning JSON video data directly');
                    responseText = processedResult.content;
                } else {
                    // For non-video results, send to AI for interpretation
                    if (!chat) {
                        throw new Error('Chat session is null before sending tool result');
                    }
                    const followUpResult = await sendMessageSafely(chat, `Tool result: ${processedResult.content}`);
                    const followUpResponse = followUpResult.response;
                    responseText = followUpResponse.text();
                }

                console.log('[API Chat] Final AI response after tool use:', responseText);
            } catch (toolError) {
                const errorDetails = {
                    toolName,
                    toolArgs,
                    error: toolError instanceof Error ? {
                        message: toolError.message,
                        stack: toolError.stack
                    } : toolError,
                    timestamp: new Date().toISOString()
                };

                console.error('[API Chat] Tool execution failed:', JSON.stringify(errorDetails, null, 2));

                // Provide more specific error messages
                let errorMessage = 'I tried to use a tool to help you, but encountered an error';
                if (toolError instanceof Error) {
                    if (toolError.message.includes('undefined')) {
                        errorMessage += ': The tool received invalid parameters. This might be due to a formatting issue in my request.';
                    } else if (toolError.message.includes('timeout')) {
                        errorMessage += ': The tool operation timed out. Please try again.';
                    } else if (toolError.message.includes('network') || toolError.message.includes('fetch')) {
                        errorMessage += ': There was a network connectivity issue. Please check your connection and try again.';
                    } else {
                        errorMessage += `: ${toolError.message}`;
                    }
                } else {
                    errorMessage += ': An unknown error occurred.';
                }

                responseText = errorMessage;
            }
        }

        // Check for persona update requests
        if (responseText.includes('PERSONA_UPDATE:')) {
            const personaMatch = responseText.match(/PERSONA_UPDATE:\s*([\s\S]*?)(?:\n|$)/);
            if (personaMatch) {
                const newPrompt = personaMatch[1].trim();
                return NextResponse.json({
                    type: 'persona_update',
                    new_prompt: newPrompt,
                    response: responseText.replace(/PERSONA_UPDATE:.*?(?:\n|$)/s, '').trim()
                });
            }
        }

        // Detect if response contains JSON video search results
        let isVideoJsonResponse = false;
        try {
            const parsedResponse = JSON.parse(responseText);
            isVideoJsonResponse = parsedResponse.response_type === 'video_search_results';
        } catch (e) {
            // Not JSON, continue with text response
        }

        if (isVideoJsonResponse) {
            console.log('[API Chat] Returning JSON video search response');
            const response = NextResponse.json({
                response: responseText,
                contentType: 'json',
                isVideoResult: true,
                timestamp: new Date().toISOString()
            });

            // Add cache-busting headers
            response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
            response.headers.set('Pragma', 'no-cache');
            response.headers.set('Expires', '0');

            return response;
        } else {
            const response = NextResponse.json({
                response: responseText,
                contentType: 'text',
                isVideoResult: false,
                timestamp: new Date().toISOString()
            });

            // Add cache-busting headers
            response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
            response.headers.set('Pragma', 'no-cache');
            response.headers.set('Expires', '0');

            return response;
        }

    } catch (error) {
        console.error('[API Chat] Error in chat handler:', error);

        // Reset chat session on critical errors
        if (error instanceof Error && (
            error.message.includes('parts field') ||
            error.message.includes('Chat session is null') ||
            error.message.includes('Invalid response structure')
        )) {
            console.log('[API Chat] Critical error detected, resetting chat session');
            resetChatSession();
        }

        if (error instanceof Error) {
            // Handle Google Generative AI API specific errors
            if (error.message.includes('parts field')) {
                return NextResponse.json({
                    error: 'AI service encountered a formatting error. The chat session has been reset. Please try again.',
                    code: 'GEMINI_API_PARTS_ERROR',
                    retryAfter: 2
                }, { status: 503 });
            }

            if (error.message.includes('GoogleGenerativeAIFetchError') || error.message.includes('400 Bad Request')) {
                return NextResponse.json({
                    error: 'AI service request failed. Please try again with a different message.',
                    code: 'GEMINI_API_REQUEST_ERROR',
                    retryAfter: 3
                }, { status: 503 });
            }

            if (error.message.includes('Chat session is null')) {
                return NextResponse.json({
                    error: 'Chat session was corrupted. Please refresh and try again.',
                    code: 'CHAT_SESSION_NULL',
                    retryAfter: 1
                }, { status: 503 });
            }

            // Handle specific initialization errors
            if (error.message.includes('Tool context initialization timeout')) {
                return NextResponse.json({
                    error: 'AI system initialization timed out. Please try again.',
                    code: 'INITIALIZATION_TIMEOUT',
                    retryAfter: 5
                }, { status: 503 });
            }

            if (error.message.includes('Tool context initialization failed')) {
                return NextResponse.json({
                    error: 'AI tools failed to initialize. Please check system status.',
                    code: 'TOOLS_INITIALIZATION_FAILED',
                    retryAfter: 10
                }, { status: 503 });
            }

            if (error.message.includes('Tool context is not available')) {
                return NextResponse.json({
                    error: 'AI tools are still loading. Please try again in a moment.',
                    code: 'TOOLS_LOADING',
                    retryAfter: 3
                }, { status: 503 });
            }

            // Handle network/connectivity errors
            if (error.message.includes('fetch') || error.message.includes('network')) {
                return NextResponse.json({
                    error: 'Unable to connect to AI services. Please check your connection.',
                    code: 'NETWORK_ERROR',
                    retryAfter: 5
                }, { status: 503 });
            }

            return NextResponse.json({
                error: 'Failed to process chat request',
                code: 'PROCESSING_ERROR',
                details: error.message
            }, { status: 500 });
        }

        return NextResponse.json({
            error: 'An unexpected error occurred',
            code: 'UNKNOWN_ERROR'
        }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const healthCheck = url.searchParams.get('health') === 'true';

    if (healthCheck) {
        // Comprehensive health check
        const healthStatus: any = {
            status: 'Chat API is running',
            timestamp: new Date().toISOString(),
            mcpServerUrl: MCP_SERVER_URL,
            toolsLoaded: !!dynamicToolsContext,
            chatInitialized: !!chat,
            isInitializing: isInitializing,
            toolContextAvailable: !!toolContextPromise
        };

        // Test MCP server connectivity
        try {
            const mcpResponse = await fetch(`${MCP_SERVER_URL}/tools`, {
                method: 'GET',
                timeout: 5000
            } as any);

            healthStatus.mcpServerStatus = mcpResponse.ok ? 'connected' : 'error';
            healthStatus.mcpServerStatusCode = mcpResponse.status;
        } catch (error) {
            healthStatus.mcpServerStatus = 'unreachable';
            healthStatus.mcpServerError = error instanceof Error ? error.message : 'Unknown error';
        }

        // Test tool context initialization
        if (!dynamicToolsContext && !isInitializing) {
            try {
                console.log('[API Chat] Health check triggering tool context initialization...');
                await initializeToolContext();
                healthStatus.toolContextTest = 'success';
            } catch (error) {
                healthStatus.toolContextTest = 'failed';
                healthStatus.toolContextError = error instanceof Error ? error.message : 'Unknown error';
            }
        } else if (dynamicToolsContext) {
            healthStatus.toolContextTest = 'already_loaded';
        } else {
            healthStatus.toolContextTest = 'initializing';
        }

        return NextResponse.json(healthStatus);
    }

    // Basic status endpoint
    return NextResponse.json({
        status: 'Chat API is running',
        mcpServerUrl: MCP_SERVER_URL,
        toolsLoaded: !!dynamicToolsContext,
        chatInitialized: !!chat,
        timestamp: new Date().toISOString()
    });
}
