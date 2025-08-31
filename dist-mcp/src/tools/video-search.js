"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.video_search = video_search;
const selenium_webdriver_1 = require("selenium-webdriver");
// Updated to build a URL with filters
async function _searchBrave(query, driver, options) {
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
        const closeButton = await driver.wait(selenium_webdriver_1.until.elementLocated(selenium_webdriver_1.By.css('button[aria-label="Close"]')), 5000);
        await closeButton.click();
    }
    catch (e) {
        console.log('[Tool:video_search] Privacy banner not found, continuing...');
    }
    const videoSelector = 'div.snippet[data-type="videos"]';
    await driver.wait(selenium_webdriver_1.until.elementLocated(selenium_webdriver_1.By.css(videoSelector)), 20000);
    const items = await driver.findElements(selenium_webdriver_1.By.css(videoSelector));
    const results = [];
    for (const item of items) {
        try {
            const anchor = await item.findElement(selenium_webdriver_1.By.css('a'));
            const url = await anchor.getAttribute('href');
            const title = await item.findElement(selenium_webdriver_1.By.css('.snippet-title')).getText();
            const img = await item.findElement(selenium_webdriver_1.By.css('img.video-thumb'));
            const thumbnail = await img.getAttribute('src');
            if (url && title && thumbnail) {
                results.push({ title, url, thumbnail });
            }
        }
        catch (e) {
            console.warn('[Tool:video_search] Could not parse a video snippet, skipping.');
        }
    }
    return results;
}
// DuckDuckGo search remains as a fallback without advanced options
async function _searchDuckDuckGo(query, driver) {
    console.log(`[Tool:video_search] [FALLBACK] Searching DuckDuckGo with query: "${query}"`);
    const searchUrl = `https://duckduckgo.com/?q=!v+${encodeURIComponent(query)}&ia=videos`;
    await driver.get(searchUrl);
    const videoSelector = '.tile--vid';
    await driver.wait(selenium_webdriver_1.until.elementLocated(selenium_webdriver_1.By.css(videoSelector)), 20000);
    const items = await driver.findElements(selenium_webdriver_1.By.css(videoSelector));
    const results = [];
    for (const item of items) {
        try {
            const titleElement = await item.findElement(selenium_webdriver_1.By.css('.tile__title > a'));
            const url = await titleElement.getAttribute('href');
            const title = await titleElement.getText();
            const thumbElement = await item.findElement(selenium_webdriver_1.By.css('.tile__media__img'));
            const style = await thumbElement.getAttribute('style');
            const thumbnailUrlMatch = style.match(/url\("(.*)"\)/);
            const thumbnail = thumbnailUrlMatch ? `https:${thumbnailUrlMatch[1]}` : '';
            if (url && title && thumbnail) {
                results.push({ title, url, thumbnail });
            }
        }
        catch (e) {
            console.warn('[Tool:video_search] [DDG] Could not parse a video snippet, skipping.');
        }
    }
    return results;
}
async function video_search(query, options = {}) {
    let driver = null;
    try {
        console.log(`[Tool:video_search] Initializing Selenium WebDriver...`);
        const capabilities = selenium_webdriver_1.Capabilities.chrome();
        capabilities.set('goog:chromeOptions', {
            args: [
                '--headless',
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            ]
        });
        driver = await new selenium_webdriver_1.Builder().withCapabilities(capabilities).build();
        let results = [];
        try {
            results = await _searchBrave(query, driver, options);
        }
        catch (braveError) {
            console.error("[Tool:video_search] Brave (Selenium) search failed. Trying DuckDuckGo...", braveError);
            results = await _searchDuckDuckGo(query, driver);
        }
        console.log(`[Tool:video_search] Found ${results.length} total results.`);
        if (results.length === 0) {
            return `[]`; // Return empty JSON array on no results
        }
        return JSON.stringify(results.slice(0, options.maxResults || 10));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('[Tool:video_search] CRITICAL ERROR in video_search:', errorMessage);
        return `{"error": "Failed to execute video search: ${errorMessage.replace(/"/g, "'")}"}`; // Return error as JSON
    }
    finally {
        if (driver) {
            await driver.quit();
            console.log('[Tool:video_search] WebDriver closed.');
        }
    }
}
