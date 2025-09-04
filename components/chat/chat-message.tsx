"use client"

import { cn } from "@/lib/utils"
import { Bot, User } from "lucide-react"
import { marked } from "marked"
import { VideoSearchResults } from "@/components/ui/video-results"

interface ChatMessageProps {
  message: {
    id: string
    role: "user" | "assistant"
    content: string
  }
}

import { useState, useEffect } from 'react';

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"
  const [parsedContent, setParsedContent] = useState<string>("")
  const [videoResults, setVideoResults] = useState<any>(null)

  useEffect(() => {
    const processMessage = async () => {
      try {
        const parsed = JSON.parse(message.content)
        if (parsed && typeof parsed === 'object' && parsed.items && Array.isArray(parsed.items)) {
          setVideoResults(parsed)
          return
        }
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].title && parsed[0].url && parsed[0].thumbnail) {
          setVideoResults({
            query: "Video Search",
            total_results: parsed.length,
            items: parsed.map((item: any) => ({
              title: item.title,
              video_url: item.url,
              thumbnail_url: item.thumbnail,
              platform: item.platform || "unknown",
            })),
          })
          return
        }
      } catch (e) {
        // Not JSON, continue
      }

      const renderer = new marked.Renderer()
      renderer.code = ({ text, lang }) => {
        return `<pre><code class="language-${lang} glass p-4 block rounded-md custom-scrollbar overflow-x-auto">${text}</code></pre>`
      }
      renderer.image = ({ href, title, text }) => {
        const titleAttr = title ? ` title="${title}"` : ''
        const altAttr = text ? ` alt="${text}"` : ' alt="Generated Image"'
        return `<div class="image-container my-4" style="display: block; width: 100%;"><img src="${href}" ${altAttr} ${titleAttr} class="generated-image max-w-full h-auto rounded-lg shadow-lg border border-primary/20" style="max-height: 512px; object-fit: contain; display: block; width: auto; margin: 0 auto;" loading="lazy" /></div>`
      }

      marked.setOptions({
        renderer,
        breaks: true,
        gfm: true
      })

      let content = await marked.parse(message.content)

      if (message.content.includes('![') && message.content.includes('data:image') && !content.includes('<img')) {
        content = message.content.replace(
          /!\[([^\]]*)\]\((data:image\/[^)]+)\)/g,
          (match, altText, dataUrl) => {
            return `<div class="image-container my-4" style="display: block; width: 100%;"><img src="${dataUrl}" alt="${altText || 'Generated Image'}" class="generated-image max-w-full h-auto rounded-lg shadow-lg border border-primary/20" style="max-height: 512px; object-fit: contain; display: block; width: auto; margin: 0 auto;" loading="lazy" /></div>`
          }
        )
      }
      setParsedContent(content)
    }

    processMessage()
  }, [message.content])


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
          <VideoSearchResults data={videoResults} />
        ) : (
          <div
            className="prose prose-invert prose-p:before:content-none prose-p:after:content-none prose-img:max-w-full prose-img:h-auto prose-img:rounded-lg prose-img:shadow-lg prose-img:border prose-img:border-primary/20 prose-img:my-4"
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
