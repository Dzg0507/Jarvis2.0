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

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"

  // Check if the message content contains video search results
  let videoResults = null
  try {
    const parsed = JSON.parse(message.content)
    // Check if it's the new VideoSearchData format
    if (parsed && typeof parsed === 'object' && parsed.items && Array.isArray(parsed.items)) {
      videoResults = parsed
    }
    // Check if it's the old array format and convert it
    else if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].title && parsed[0].url && parsed[0].thumbnail) {
      videoResults = {
        query: "Video Search",
        total_results: parsed.length,
        creator_results_count: 0,
        items: parsed.map(item => ({
          title: item.title,
          video_url: item.url,
          thumbnail_url: item.thumbnail,
          platform: item.platform || "unknown",
          is_creator_content: false,
          description: item.description || null,
          duration: item.duration || null,
          view_count: item.view_count || null
        })),
        search_metadata: {
          primary_search_successful: true,
          fallback_search_used: false,
          web_search_supplemented: false
        },
        web_search_content: {
          youtube_channel_url: null,
          twitch_channel_url: null,
          additional_links: [],
          extraction_metadata: {
            sources_found: 0,
            extraction_successful: false
          }
        }
      }
    }
  } catch (e) {
    // Not JSON or not video results, continue with normal rendering
  }

  // Simple approach: let markdown handle everything, including images

  // For non-image content, use standard markdown processing
  const renderer = new marked.Renderer()
  renderer.code = ({ text, lang }) => {
    return `<pre><code class="language-${lang} glass p-4 block rounded-md custom-scrollbar overflow-x-auto">${text}</code></pre>`
  }

  // Enhanced image renderer with debugging and proper data URL handling
  renderer.image = ({ href, title, text }) => {
    console.log('[ChatMessage] Rendering image:', { href: href?.substring(0, 50) + '...', title, text });

    const titleAttr = title ? ` title="${title}"` : ''
    const altAttr = text ? ` alt="${text}"` : ' alt="Generated Image"'

    // Always wrap images in a div for proper display
    const imageHtml = `<div class="image-container my-4" style="display: block; width: 100%;">
      <img
        src="${href}"
        ${altAttr}
        ${titleAttr}
        class="generated-image max-w-full h-auto rounded-lg shadow-lg border border-primary/20"
        style="max-height: 512px; object-fit: contain; display: block; width: auto; margin: 0 auto;"
        loading="lazy"
        onload="console.log('Image loaded successfully')"
        onerror="console.error('Image failed to load:', this.src.substring(0, 50))"
      />
    </div>`;

    console.log('[ChatMessage] Generated image HTML:', imageHtml.substring(0, 200) + '...');
    return imageHtml;
  }

  marked.setOptions({
    renderer,
    breaks: true,
    gfm: true,
    sanitize: false,
    smartypants: false
  })

  // Debug logging
  console.log('[ChatMessage] Processing message content:', message.content.substring(0, 200) + '...');
  console.log('[ChatMessage] Contains image markdown:', message.content.includes('!['));
  console.log('[ChatMessage] Contains data:image:', message.content.includes('data:image'));
  console.log('[ChatMessage] Full message content:', message.content);

  // Test markdown parsing with a simple example
  const testMarkdown = '![Test](data:image/png;base64,test)';
  const testParsed = marked.parse(testMarkdown);
  console.log('[ChatMessage] Test markdown parsing:', testMarkdown, '->', testParsed);

  let parsedContent = marked.parse(message.content)
  console.log('[ChatMessage] Parsed HTML content:', parsedContent.substring(0, 500) + '...');

  // Fallback: If markdown didn't convert images, do it manually
  if (message.content.includes('![') && message.content.includes('data:image') && !parsedContent.includes('<img')) {
    console.log('[ChatMessage] Markdown parser failed to convert images, doing manual conversion');
    parsedContent = message.content.replace(
      /!\[([^\]]*)\]\((data:image\/[^)]+)\)/g,
      (match, altText, dataUrl) => {
        console.log('[ChatMessage] Manual image conversion:', { altText, dataUrl: dataUrl.substring(0, 50) + '...' });
        return `<div class="image-container my-4" style="display: block; width: 100%;">
          <img
            src="${dataUrl}"
            alt="${altText || 'Generated Image'}"
            class="generated-image max-w-full h-auto rounded-lg shadow-lg border border-primary/20"
            style="max-height: 512px; object-fit: contain; display: block; width: auto; margin: 0 auto;"
            loading="lazy"
            onload="console.log('Manual image loaded successfully')"
            onerror="console.error('Manual image failed to load')"
          />
        </div>`;
      }
    );
    console.log('[ChatMessage] After manual conversion:', parsedContent.substring(0, 300) + '...');
  }

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
