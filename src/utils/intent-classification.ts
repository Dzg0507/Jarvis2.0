/**
 * Intent Classification System for Video Search Queries
 * 
 * This module analyzes user prompts to distinguish between general and specific
 * video search intents, enabling smart fallback logic that only triggers when necessary.
 */

export type VideoSearchIntent = 'general' | 'specific';

export interface IntentAnalysisResult {
  intent: VideoSearchIntent;
  confidence: number;
  reasoning: string;
  indicators: string[];
}

// General intent patterns - broad searches that typically return adequate results
const GENERAL_INTENT_PATTERNS = {
  // Broad creator requests
  broad_creator: [
    /videos?\s+by\s+(\w+)/i,
    /show\s+me\s+(\w+)'?s?\s+(content|videos?)/i,
    /(\w+)'?s?\s+(videos?|content)/i,
    /find\s+(\w+)\s+videos?/i
  ],
  
  // Game/topic searches
  game_topic: [
    /(\w+)\s+videos?/i,
    /(\w+)\s+(\w+)\s+gameplay/i,
    /(\w+)\s+playing\s+(\w+)/i,
    /(\w+)\s+(\w+)\s+(content|videos?)/i
  ],
  
  // Channel discovery
  channel_discovery: [
    /(\w+)'?s?\s+channel/i,
    /find\s+(\w+)\s+channel/i,
    /(\w+)\s+youtube/i,
    /(\w+)\s+twitch/i
  ],
  
  // Simple combinations
  simple_combinations: [
    /(\w+)\s+(rust|minecraft|fortnite|valorant|csgo|cod|apex)/i,
    /(rust|minecraft|fortnite|valorant|csgo|cod|apex)\s+by\s+(\w+)/i
  ]
};

// Specific intent patterns - targeted searches that may need fallback assistance
const SPECIFIC_INTENT_PATTERNS = {
  // Event-specific queries
  event_specific: [
    /the\s+video\s+where\s+.+/i,
    /when\s+(\w+)\s+(did|does|made|makes)\s+.+/i,
    /(\w+)'?s?\s+(raid|attack|battle|fight|war)\s+(on|against|with)\s+.+/i,
    /the\s+(raid|attack|battle|fight|war)\s+(on|against|with)\s+.+/i
  ],
  
  // Temporal references
  temporal: [
    /(\w+)'?s?\s+(first|latest|recent|newest|oldest|last)\s+.+/i,
    /(first|latest|recent|newest|oldest|last)\s+(\w+)\s+video/i,
    /(\w+)'?s?\s+(new|old)\s+.+/i,
    /(yesterday|today|this\s+week|last\s+week|this\s+month)\s+.+/i
  ],
  
  // Unique identifiers
  unique_identifiers: [
    /the\s+(\w+)\s+(tournament|competition|event|stream)\s+.+/i,
    /(tournament|competition|event|stream)\s+(final|finals|championship)/i,
    /(\w+)\s+(vs|versus|against)\s+(\w+)/i,
    /the\s+.+\s+(incident|drama|controversy)/i
  ],
  
  // Descriptive scenarios
  descriptive_scenarios: [
    /find\s+the\s+video\s+where\s+.+/i,
    /looking\s+for\s+the\s+video\s+.+/i,
    /(\w+)\s+(building|making|creating|destroying)\s+.+/i,
    /(\w+)\s+(with|using)\s+(\w+)\s+(to|for|against)\s+.+/i,
    /the\s+one\s+where\s+.+/i
  ]
};

/**
 * Analyzes a user query to determine video search intent
 * @param query - The original user query
 * @returns Intent analysis result with classification and reasoning
 */
export function classifyVideoSearchIntent(query: string): IntentAnalysisResult {
  const normalizedQuery = query.toLowerCase().trim();
  const indicators: string[] = [];
  let specificScore = 0;
  let generalScore = 0;
  
  // Check for specific intent patterns
  for (const [category, patterns] of Object.entries(SPECIFIC_INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(normalizedQuery)) {
        specificScore += 2;
        indicators.push(`specific:${category}`);
      }
    }
  }
  
  // Check for general intent patterns
  for (const [category, patterns] of Object.entries(GENERAL_INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(normalizedQuery)) {
        generalScore += 1;
        indicators.push(`general:${category}`);
      }
    }
  }
  
  // Additional specific intent signals
  const specificKeywords = [
    'the video where', 'find the video', 'looking for the video',
    'first', 'latest', 'recent', 'newest', 'oldest', 'last',
    'tournament', 'competition', 'event', 'final', 'championship',
    'raid', 'attack', 'battle', 'fight', 'war', 'vs', 'versus', 'against',
    'incident', 'drama', 'controversy', 'when he', 'when she',
    'the one where', 'that time when', 'remember when'
  ];
  
  for (const keyword of specificKeywords) {
    if (normalizedQuery.includes(keyword)) {
      specificScore += 1;
      indicators.push(`specific:keyword:${keyword}`);
    }
  }
  
  // Additional general intent signals
  const generalKeywords = [
    'videos by', 'show me', 'find videos', 'channel', 'content',
    'gameplay', 'playing', 'youtube', 'twitch'
  ];
  
  for (const keyword of generalKeywords) {
    if (normalizedQuery.includes(keyword)) {
      generalScore += 0.5;
      indicators.push(`general:keyword:${keyword}`);
    }
  }
  
  // Determine intent based on scores
  const totalScore = specificScore + generalScore;
  const specificRatio = totalScore > 0 ? specificScore / totalScore : 0;
  
  let intent: VideoSearchIntent;
  let confidence: number;
  let reasoning: string;
  
  if (specificScore === 0 && generalScore > 0) {
    // Clear general intent
    intent = 'general';
    confidence = Math.min(0.95, 0.7 + (generalScore * 0.1));
    reasoning = `Strong general intent indicators (${generalScore} points) with no specific markers`;
  } else if (specificRatio >= 0.6) {
    // Strong specific intent
    intent = 'specific';
    confidence = Math.min(0.95, 0.6 + (specificRatio * 0.3));
    reasoning = `High specific intent ratio (${(specificRatio * 100).toFixed(1)}%) with ${specificScore} specific markers`;
  } else if (specificScore > 0 && specificRatio >= 0.4) {
    // Moderate specific intent
    intent = 'specific';
    confidence = Math.min(0.8, 0.5 + (specificRatio * 0.2));
    reasoning = `Moderate specific intent ratio (${(specificRatio * 100).toFixed(1)}%) with ${specificScore} specific markers`;
  } else {
    // Default to general for ambiguous cases
    intent = 'general';
    confidence = Math.max(0.3, 0.6 - (specificRatio * 0.3));
    reasoning = `Ambiguous or general intent (specific ratio: ${(specificRatio * 100).toFixed(1)}%), defaulting to general`;
  }
  
  return {
    intent,
    confidence,
    reasoning,
    indicators
  };
}

/**
 * Enhanced relevance scoring for specific intent queries
 * @param videoResults - Array of video results from search
 * @param originalQuery - The original user query
 * @returns Relevance score between 0 and 1
 */
export function calculateSpecificIntentRelevance(videoResults: any[], originalQuery: string): number {
  if (!Array.isArray(videoResults) || videoResults.length === 0) {
    return 0;
  }
  
  const normalizedQuery = originalQuery.toLowerCase();
  const queryWords = normalizedQuery.split(/\s+/).filter(word => word.length > 2);
  
  let totalRelevance = 0;
  
  for (const video of videoResults) {
    const title = (video.title || '').toLowerCase();
    let videoRelevance = 0;
    
    // Keyword matching score
    let keywordMatches = 0;
    for (const word of queryWords) {
      if (title.includes(word)) {
        keywordMatches++;
      }
    }
    videoRelevance += (keywordMatches / queryWords.length) * 0.6;
    
    // Event-specific language detection
    const eventKeywords = ['raid', 'attack', 'battle', 'fight', 'war', 'tournament', 'final', 'championship'];
    for (const keyword of eventKeywords) {
      if (normalizedQuery.includes(keyword) && title.includes(keyword)) {
        videoRelevance += 0.2;
        break;
      }
    }
    
    // Temporal alignment
    const temporalKeywords = ['first', 'latest', 'recent', 'new', 'old'];
    for (const keyword of temporalKeywords) {
      if (normalizedQuery.includes(keyword) && title.includes(keyword)) {
        videoRelevance += 0.2;
        break;
      }
    }
    
    totalRelevance += Math.min(1, videoRelevance);
  }
  
  return totalRelevance / videoResults.length;
}

/**
 * Determines if web search fallback should be triggered based on intent and relevance
 * @param intent - The classified intent of the query
 * @param relevanceScore - The relevance score of initial results (for specific queries)
 * @returns Whether fallback should be triggered
 */
export function shouldTriggerFallback(intent: VideoSearchIntent, relevanceScore: number): boolean {
  if (intent === 'general') {
    // Never trigger fallback for general queries
    return false;
  }
  
  // For specific queries, trigger fallback only if relevance is very low
  return relevanceScore <= 0.1; // 10% threshold
}
