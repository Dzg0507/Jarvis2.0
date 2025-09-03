import { Builder, By, until, WebDriver, Capabilities } from 'selenium-webdriver';

// Enhanced options for better content discovery
interface VideoSearchOptions {
    maxResults?: number;
    duration?: 'short' | 'medium' | 'long';
    sortBy?: 'relevance' | 'date';
    contentType?: 'story' | 'plot' | 'narrative' | 'any';
}

interface SearchResult {
    title: string;
    url: string;
    thumbnail: string;
}

// Enhanced query builder for story-focused content
function enhanceQueryForStoryContent(baseQuery: string, contentType?: string): string[] {
    const storyKeywords = [
        'story', 'plot', 'narrative', 'tale', 'scenario', 'situation',
        'roleplay', 'rp', 'fantasy', 'erotic story', 'seduction story',
        'taboo story', 'family fantasy', 'step family story', 'incest fantasy'
    ];

    const qualityIndicators = [
        'full video', 'complete story', 'long version', 'extended',
        'detailed plot', 'in-depth', 'comprehensive'
    ];

    const baseQueries = [baseQuery];

    // Add story-focused variations
    if (contentType === 'story' || contentType === 'plot' || contentType === 'narrative') {
        storyKeywords.forEach(keyword => {
            baseQueries.push(`${baseQuery} ${keyword}`);
        });

        // Add quality indicators for longer, more detailed content
        qualityIndicators.forEach(indicator => {
            baseQueries.push(`${baseQuery} ${indicator}`);
        });

        // Add specific search operators for better results
        baseQueries.push(`"${baseQuery}" story`);
        baseQueries.push(`${baseQuery} -short -clip -trailer`);
    }

    return baseQueries.slice(0, 5); // Limit to 5 queries to avoid overwhelming the search
}

// Filter results to prioritize story content
function filterStoryContent(results: SearchResult[]): SearchResult[] {
    const storyIndicators = [
        'story', 'plot', 'tale', 'narrative', 'scenario', 'fantasy',
        'roleplay', 'seduction', 'taboo', 'family', 'step', 'brother', 'sister',
        'complete', 'full', 'long', 'detailed', 'erotic'
    ];

    return results
        .map(result => ({
            ...result,
            storyScore: storyIndicators.reduce((score, indicator) =>
                score + (result.title.toLowerCase().includes(indicator) ? 1 : 0), 0)
        }))
        .sort((a, b) => (b as any).storyScore - (a as any).storyScore)
        .map(({ storyScore, ...result }) => result);
}

// Updated to build a URL with filters
async function _searchBrave(query: string, driver: WebDriver, options: VideoSearchOptions): Promise<SearchResult[]> {
    console.log(`[Tool:video_search] Searching Brave with query: "${query}" and options:`, options);
    
    let searchUrl = `https://search.brave.com/videos?q=${encodeURIComponent(query)}&safesearch=off`;

    const filters = [];
    if (options.duration && ['short', 'medium', 'long'].includes(options.duration)) {
        filters.push(`duration:${options.duration}`);
    }
    if (options.sortBy === 'date') {
        filters.push('time:week'); // Brave uses recency filters like 'past week'
    }
    if (filters.length > 0) {
        searchUrl += `&filters=${filters.join(',')}`;
    }

    console.log(`[Tool:video_search] Navigating to URL: ${searchUrl}`);
    await driver.get(searchUrl);

    try {
        const closeButton = await driver.wait(until.elementLocated(By.css('button[aria-label="Close"]')), 5000);
        await closeButton.click();
    } catch (e) { 
        console.log('[Tool:video_search] Privacy banner not found, continuing...'); 
    }

    const videoSelector = 'div.snippet[data-type="videos"]';
    await driver.wait(until.elementLocated(By.css(videoSelector)), 20000);
    const items = await driver.findElements(By.css(videoSelector));
    const results: SearchResult[] = [];
    for (const item of items) {
        try {
            const anchor = await item.findElement(By.css('a'));
            const url = await anchor.getAttribute('href');
            const title = await item.findElement(By.css('.snippet-title')).getText();
            const img = await item.findElement(By.css('img.video-thumb'));
            const thumbnail = await img.getAttribute('src');
            if (url && title && thumbnail) {
                results.push({ title, url, thumbnail });
            }
        } catch (e) { 
            console.warn('[Tool:video_search] Could not parse a video snippet, skipping.'); 
        }
    }
    return results;
}

// DuckDuckGo search remains as a fallback without advanced options
async function _searchDuckDuckGo(query: string, driver: WebDriver): Promise<SearchResult[]> {
    console.log(`[Tool:video_search] [FALLBACK] Searching DuckDuckGo with query: "${query}"`);
    const searchUrl = `https://duckduckgo.com/?q=!v+${encodeURIComponent(query)}&ia=videos&kp=-2`;
    await driver.get(searchUrl);
    const videoSelector = '.tile--vid';
    await driver.wait(until.elementLocated(By.css(videoSelector)), 20000);
    const items = await driver.findElements(By.css(videoSelector));
    const results: SearchResult[] = [];
    for (const item of items) {
         try {
            const titleElement = await item.findElement(By.css('.tile__title > a'));
            const url = await titleElement.getAttribute('href');
            const title = await titleElement.getText();
            const thumbElement = await item.findElement(By.css('.tile__media__img'));
            const style = await thumbElement.getAttribute('style');
            const thumbnailUrlMatch = style.match(/url\("(.*)"\)/);
            const thumbnail = thumbnailUrlMatch ? `https:${thumbnailUrlMatch[1]}` : '';
            if (url && title && thumbnail) {
                results.push({ title, url, thumbnail });
            }
        } catch (e) { 
            console.warn('[Tool:video_search] [DDG] Could not parse a video snippet, skipping.'); 
        }
    }
    return results;
}

export async function video_search(query: string, options: VideoSearchOptions = {}): Promise<string> {
  let driver: WebDriver | null = null;
  try {
    console.log(`[Tool:video_search] Initializing Selenium WebDriver...`);

    const capabilities = Capabilities.chrome();
    capabilities.set('goog:chromeOptions', {
        args: [
            '--headless',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        ]
    });

    driver = await new Builder().withCapabilities(capabilities).build();

    let allResults: SearchResult[] = [];

    // Generate enhanced queries for story content
    const queries = enhanceQueryForStoryContent(query, options.contentType);
    console.log(`[Tool:video_search] Generated ${queries.length} search queries:`, queries);

    // Try each query and collect results
    for (const searchQuery of queries) {
        try {
            console.log(`[Tool:video_search] Trying query: "${searchQuery}"`);
            let results: SearchResult[] = [];

            try {
                results = await _searchBrave(searchQuery, driver, options);
            } catch (braveError) {
                console.error(`[Tool:video_search] Brave search failed for "${searchQuery}". Trying DuckDuckGo...`, braveError);
                results = await _searchDuckDuckGo(searchQuery, driver);
            }

            if (results.length > 0) {
                allResults.push(...results);
                console.log(`[Tool:video_search] Query "${searchQuery}" returned ${results.length} results`);
            }

            // Small delay between searches to be respectful
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (queryError) {
            console.warn(`[Tool:video_search] Query "${searchQuery}" failed:`, queryError);
            continue;
        }
    }

    console.log(`[Tool:video_search] Total results collected: ${allResults.length}`);

    if (allResults.length === 0) {
        return `[]`; // Return empty JSON array on no results
    }

    // Filter and prioritize story content
    let processedResults = allResults;

    if (options.contentType === 'story' || options.contentType === 'plot' || options.contentType === 'narrative') {
        console.log(`[Tool:video_search] Filtering results for story content...`);
        processedResults = filterStoryContent(allResults);
    }

    // Ensure all results have valid thumbnails and remove duplicates
    const validResults = processedResults
        .filter(result =>
            result.title &&
            result.url &&
            result.thumbnail &&
            result.thumbnail.startsWith('http')
        )
        .filter((result, index, self) =>
            index === self.findIndex(r => r.url === result.url)
        );

    console.log(`[Tool:video_search] Final valid results: ${validResults.length}`);

    return JSON.stringify(validResults.slice(0, options.maxResults || 10));
  } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('[Tool:video_search] CRITICAL ERROR in video_search:', errorMessage);
      return `{"error": "Failed to execute video search: ${errorMessage.replace(/"/g, "'")}"}`; // Return error as JSON
  } finally {
    if (driver) {
      await driver.quit();
      console.log('[Tool:video_search] WebDriver closed.');
    }
  }
}
