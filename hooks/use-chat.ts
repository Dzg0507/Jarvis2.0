"use client"

import { useState } from "react"
import { nanoid } from "nanoid"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

export const useChat = (initialMessages: Message[] = []) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [activeTool, setActiveTool] = useState<string | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage: Message = { id: nanoid(), role: "user", content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setActiveTool(null) // Reset active tool

    try {
      // Use the Next.js API route instead of direct MCP server
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: input }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      const result = await response.json()

      // This is a simplified check. You might expand this later.
      if (result.response && typeof result.response === "object" && result.response.tool) {
        setActiveTool(result.response.tool)
      }

      const aiMessage: Message = {
        id: nanoid(),
        role: "assistant",
        content: typeof result.response === "string" ? result.response : JSON.stringify(result.response, null, 2),
      }
      setMessages((prev) => [...prev, aiMessage])
    } catch (error) {
      console.error("Failed to fetch chat response:", error)
      const errorMessage: Message = {
        id: nanoid(),
        role: "assistant",
        content: "Error: Could not connect to J.A.R.V.I.S. core systems. Please check server status.",
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      setActiveTool(null)
    }
  }

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    activeTool,
  }
}