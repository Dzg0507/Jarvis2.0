"use client"

import { useState, useCallback, useEffect } from "react"

interface MemoryFragment {
    id: string
    content: string
    context: string
    importance: number
    timestamp: Date
    tags: string[]
    relatedFiles: string[]
    conversationId: string
}

interface ConversationSession {
    id: string
    title: string
    startTime: Date
    lastActivity: Date
    messageCount: number
    keyTopics: string[]
    fileReferences: string[]
}

// Corrected interface to use Record<string, string[]> for JSON compatibility
interface MemoryIndex {
    fragments: MemoryFragment[]
    sessions: ConversationSession[]
    topicMap: Record<string, string[]>
    fileMap: Record<string, string[]>
}

export function useMemorySystem() {
    const [memorySystem, setMemorySystem] = useState<MemoryIndex>({
        fragments: [],
        sessions: [],
        topicMap: {}, // Initialize as an empty object
        fileMap: {}, // Initialize as an empty object
    })
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const loadMemory = async () => {
            try {
                const response = await fetch('/api/memory');
                if (!response.ok) {
                    throw new Error('Failed to load memory');
                }
                const data = await response.json();

                const fragments = data.fragments.map((f: any) => ({
                    ...f,
                    timestamp: new Date(f.timestamp),
                }));

                setMemorySystem({
                    fragments,
                    sessions: data.sessions || [],
                    // Assign directly since it's now the correct type (Record)
                    topicMap: data.topicMap || {},
                    fileMap: data.fileMap || {},
                });
            } catch (error) {
                console.error("Failed to load memory from server:", error);
            } finally {
                setIsLoaded(true);
            }
        };
        loadMemory();
    }, []); // Load once on component mount

    useEffect(() => {
        if (!isLoaded) {
            return; // Don't save until memory is loaded from disk
        }
        const saveMemory = async () => {
            try {
                // No need to convert Maps to objects, data is already in the correct format
                const memoryToSave = memorySystem;

                await fetch('/api/memory', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(memoryToSave),
                });
            } catch (error) {
                console.error("Failed to save memory to server:", error);
            }
        };

        // Debounce saving to avoid excessive requests
        const handler = setTimeout(() => {
            saveMemory();
        }, 1000);

        return () => {
            clearTimeout(handler);
        };

    }, [memorySystem, isLoaded]); // Save when memory changes, but only after it's loaded

    const extractTopics = useCallback((text: string): string[] => {
        const commonWords = new Set([
            "the",
            "a",
            "an",
            "and",
            "or",
            "but",
            "in",
            "on",
            "at",
            "to",
            "for",
            "of",
            "with",
            "by",
            "is",
            "are",
            "was",
            "were",
            "be",
            "been",
            "have",
            "has",
            "had",
            "do",
            "does",
            "did",
            "will",
            "would",
            "could",
            "should",
            "may",
            "might",
            "can",
            "this",
            "that",
            "these",
            "those",
            "i",
            "you",
            "he",
            "she",
            "it",
            "we",
            "they",
        ])

        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, " ")
            .split(/\s+/)
            .filter((word) => word.length > 3 && !commonWords.has(word))
            .slice(0, 10)
    }, [])

    const calculateImportance = useCallback((content: string, context: string[]): number => {
        let score = 1
        if (content.length > 100) score += 1
        if (context.length > 0) score += 1
        if (content.includes("important") || content.includes("remember")) score += 2
        if (content.includes("?")) score += 1
        return Math.min(score, 5)
    }, [])

    const addToMemory = useCallback(
        (message: any, contextualMemory: string[]) => {
            const topics = extractTopics(message.content)
            const importance = calculateImportance(message.content, contextualMemory)

            const fragment: MemoryFragment = {
                id: `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                content: message.content,
                context: contextualMemory.join(" | "),
                importance,
                timestamp: message.timestamp,
                tags: topics,
                relatedFiles: message.fileReferences || [],
                conversationId: message.conversationId || "default",
            }

            setMemorySystem((prev) => ({
                ...prev,
                fragments: [fragment, ...prev.fragments].slice(0, 1000), // Keep last 1000 fragments
            }))
        },
        [extractTopics, calculateImportance],
    )

    const searchMemory = useCallback(
        (query: string, limit = 10): MemoryFragment[] => {
            const queryTerms = query
                .toLowerCase()
                .split(/\s+/)
                .filter((term) => term.length > 2)
            if (queryTerms.length === 0) return []

            return memorySystem.fragments
                .filter((fragment) =>
                    queryTerms.some(
                        (term) =>
                            fragment.content.toLowerCase().includes(term) ||
                            fragment.tags.some((tag) => tag.includes(term)) ||
                            fragment.context.toLowerCase().includes(term),
                    ),
                )
                .sort((a, b) => {
                    const aRelevance = queryTerms.reduce((score, term) => {
                        if (a.content.toLowerCase().includes(term)) score += 3
                        if (a.tags.some((tag) => tag.includes(term))) score += 2
                        if (a.context.toLowerCase().includes(term)) score += 1
                        return score
                    }, 0)

                    const bRelevance = queryTerms.reduce((score, term) => {
                        if (b.content.toLowerCase().includes(term)) score += 3
                        if (b.tags.some((tag) => tag.includes(term))) score += 2
                        if (b.context.toLowerCase().includes(term)) score += 1
                        return score
                    }, 0)

                    // Sort by relevance, then importance, then timestamp
                    const relevanceDiff = (bRelevance * b.importance) - (aRelevance * a.importance);
                    if (relevanceDiff !== 0) return relevanceDiff;
                    return b.timestamp.getTime() - a.timestamp.getTime();
                })
                .slice(0, limit)
        },
        [memorySystem.fragments],
    )

    const getContextualMemory = useCallback(
        (currentInput: string): string[] => {
            if (!currentInput.trim()) return []

            const relevantMemories = searchMemory(currentInput, 3)
            return relevantMemories.map(
                (memory) => `[Memory: ${memory.timestamp.toLocaleDateString()}] ${memory.content.slice(0, 100)}...`,
            )
        },
        [searchMemory],
    )

    return {
        memorySystem,
        addToMemory,
        searchMemory,
        getContextualMemory,
        extractTopics,
    }
}