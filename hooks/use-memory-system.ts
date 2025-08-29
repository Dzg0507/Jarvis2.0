"use client"

import { useState, useCallback } from "react"

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

interface MemoryIndex {
  fragments: MemoryFragment[]
  sessions: ConversationSession[]
  topicMap: Map<string, string[]>
  fileMap: Map<string, string[]>
}

export function useMemorySystem() {
  const [memorySystem, setMemorySystem] = useState<MemoryIndex>({
    fragments: [],
    sessions: [],
    topicMap: new Map(),
    fileMap: new Map(),
  })

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

          return bRelevance * b.importance - aRelevance * a.importance
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
