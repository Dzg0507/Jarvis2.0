"use client"

import { useState, useEffect, useCallback } from "react"

interface ClipboardItem {
  id: string
  content: string
  type: "text" | "code" | "url" | "email" | "number" | "color" | "snippet"
  timestamp: Date
}

export function useClipboard() {
  const [clipboardItems, setClipboardItems] = useState<ClipboardItem[]>([])
  const [lastClipboardContent, setLastClipboardContent] = useState("")

  const detectContentType = useCallback((text: string): ClipboardItem["type"] => {
    if (text.match(/^https?:\/\//)) return "url"
    if (text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)) return "email"
    if (text.match(/^\d+$/)) return "number"
    if (text.match(/^[A-F0-9]{6}$/i)) return "color"
    if (text.includes("function") || text.includes("const") || text.includes("=>")) return "code"
    if (text.length > 100) return "text"
    return "snippet"
  }, [])

  const addToClipboard = useCallback(
    (content: string, type?: ClipboardItem["type"]) => {
      const detectedType = type || detectContentType(content)
      const newItem: ClipboardItem = {
        id: Date.now().toString(),
        content,
        type: detectedType,
        timestamp: new Date(),
      }
      setClipboardItems((prev) => [newItem, ...prev.slice(0, 49)]) // Keep only 50 items
    },
    [detectContentType],
  )

  const clearClipboard = useCallback(() => {
    setClipboardItems([])
  }, [])

  const monitorClipboard = useCallback(async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText()
        if (text && text !== lastClipboardContent && text.trim().length > 0) {
          addToClipboard(text)
          setLastClipboardContent(text)
        }
      }
    } catch (err) {
      // Safe to ignore clipboard access errors
    }
  }, [lastClipboardContent, addToClipboard])

  useEffect(() => {
    const interval = setInterval(monitorClipboard, 1000)
    return () => clearInterval(interval)
  }, [monitorClipboard])

  return {
    clipboardItems,
    addToClipboard,
    clearClipboard,
  }
}
