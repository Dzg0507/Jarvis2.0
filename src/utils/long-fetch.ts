/**
 * Custom fetch wrapper for long-running requests like image generation
 * Handles Node.js timeout issues properly
 */

export interface LongFetchOptions extends RequestInit {
  timeoutMs?: number;
}

export async function longFetch(url: string, options: LongFetchOptions = {}): Promise<Response> {
  const { timeoutMs = 20 * 60 * 1000, ...fetchOptions } = options; // Default 20 minutes
  
  // Create abort controller for our custom timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    // Use native fetch with our abort signal
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Re-throw with better error message for timeouts
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000} seconds`);
    }
    
    throw error;
  }
}
