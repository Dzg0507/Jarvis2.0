"use client"

import { cn } from "@/lib/utils"
import { Bot, User } from "lucide-react"
import { marked } from "marked"
import { VideoResults } from "@/components/ui/video-results"

interface ChatMessageProps {
  message: {
    id: string
    role: "user" | "assistant"
    content: string
  }
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"

  // Check if the message content contains video search results
  let videoResults = null
  try {
    const parsed = JSON.parse(message.content)
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].title && parsed[0].url && parsed[0].thumbnail) {
      videoResults = parsed
    }
  } catch (e) {
    // Not JSON or not video results, continue with normal rendering
  }

  const renderer = new marked.Renderer()
  renderer.code = ({ text, lang, escaped }) => {
    return `<pre><code class="language-${lang} glass p-4 block rounded-md custom-scrollbar overflow-x-auto">${text}</code></pre>`
  }
  marked.setOptions({ renderer, breaks: true, gfm: true })

  const parsedContent = marked.parse(message.content)

  return (
    <div className={cn("flex items-start gap-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center border border-secondary neon-border-green">
          <Bot className="w-6 h-6 text-secondary" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[75%] p-4 rounded-3xl shadow-lg",
          isUser
            ? "bg-primary/20 border border-primary text-white rounded-br-none shadow-primary/30"
            : "bg-secondary/20 border border-secondary text-white rounded-bl-none shadow-secondary/30"
        )}
      >
        {videoResults ? (
          <VideoResults results={videoResults} />
        ) : (
          <div
            className="prose prose-invert prose-p:before:content-none prose-p:after:content-none"
            dangerouslySetInnerHTML={{ __html: parsedContent }}
          />
        )}
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary neon-border-cyan">
          <User className="w-6 h-6 text-primary" />
        </div>
      )}
    </div>
  )
}
