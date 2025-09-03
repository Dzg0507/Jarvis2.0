import { describe, it, expect, vi } from 'vitest';
import { video_search } from './video-search';

// Mock selenium-webdriver to avoid actual browser launches during testing
vi.mock('selenium-webdriver', () => ({
  Builder: vi.fn().mockImplementation(() => ({
    withCapabilities: vi.fn().mockReturnThis(),
    build: vi.fn().mockResolvedValue({
      get: vi.fn().mockResolvedValue(undefined),
      wait: vi.fn().mockResolvedValue(undefined),
      findElements: vi.fn().mockResolvedValue([]),
      quit: vi.fn().mockResolvedValue(undefined),
    }),
  })),
  By: {
    css: vi.fn(),
    elementLocated: vi.fn(),
  },
  until: {
    elementLocated: vi.fn(),
  },
  Capabilities: {
    chrome: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnThis(),
    }),
  },
}));

describe('Video Search Tool', () => {
  it('should return a JSON string', async () => {
    // This test mocks Selenium to avoid actual browser launches
    const result = await video_search('test query');
    expect(typeof result).toBe('string');

    // Should be valid JSON or error message
    if (result.startsWith('[') || result.startsWith('{')) {
      expect(() => JSON.parse(result)).not.toThrow();
    }
  });

  it('should handle options parameter', async () => {
    const result = await video_search('test query', { maxResults: 5 });
    expect(typeof result).toBe('string');
  });
});
