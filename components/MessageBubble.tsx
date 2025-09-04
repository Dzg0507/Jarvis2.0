'use client';

import React from 'react';
import { VideoSearchResults } from '@/components/ui/video-results';
import { Message } from '@/contexts/ChatContext';
import { TTSControls } from '@/components/ui/tts-controls';
import { marked } from 'marked';

interface MessageBubbleProps {
  message: Message;
  personaColor?: string;
  personaName?: string;
  personaTraits?: string[];
  voiceId?: string;
}

export default function MessageBubble({
  message,
  personaColor,
  personaName = 'AI',
  personaTraits = [],
  voiceId
}: MessageBubbleProps) {
  const isUser = message.sender === 'user';
  const isVideoResult = message.contentType === 'video_search' && message.videoData;

  // Configure markdown renderer for proper image handling
  const renderer = new marked.Renderer();

  // Configure marked for basic markdown processing
  marked.setOptions({
    breaks: true,
    gfm: true,
    sanitize: false,
    smartypants: false
  });

  // Process message text - handle images specially
  const processedText = !isVideoResult ? (() => {
    console.log('[MessageBubble] Processing message text:', message.text.substring(0, 200) + '...');
    console.log('[MessageBubble] Contains image markdown:', message.text.includes('!['));
    console.log('[MessageBubble] Contains data:image:', message.text.includes('data:image'));

    // Check if this message contains base64 images
    if (message.text.includes('![') && message.text.includes('data:image')) {
      console.log('[MessageBubble] Processing base64 image directly');

      // Extract and render images directly without markdown processing
      const imageRegex = /!\[([^\]]*)\]\((data:image\/[^)]+)\)/g;
      let processedContent = message.text;

      processedContent = processedContent.replace(imageRegex, (match, altText, dataUrl) => {
        console.log('[MessageBubble] Found base64 image:', {
          altText,
          dataUrlLength: dataUrl.length,
          dataUrlStart: dataUrl.substring(0, 50) + '...',
          isValidDataUrl: dataUrl.startsWith('data:image/'),
          hasBase64: dataUrl.includes('base64,')
        });

        // Validate the data URL
        if (!dataUrl.startsWith('data:image/') || !dataUrl.includes('base64,')) {
          console.error('[MessageBubble] Invalid data URL format:', dataUrl.substring(0, 100));
          return `<div class="image-error my-4 p-4 border border-red-500/30 rounded-lg bg-red-500/10">
            <p class="text-red-400 text-sm">❌ Invalid image format</p>
          </div>`;
        }

        return `<div class="image-container my-4" style="display: block; width: 100%; text-align: center;">
          <img
            src="${dataUrl}"
            alt="${altText || 'Generated Image'}"
            class="generated-image"
            style="max-width: 100%; max-height: 512px; height: auto; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border: 1px solid rgba(255, 255, 255, 0.2);"
            onload="console.log('✅ Base64 image loaded successfully, size:', this.naturalWidth + 'x' + this.naturalHeight)"
            onerror="console.error('❌ Base64 image failed to load. URL length:', this.src.length, 'URL start:', this.src.substring(0, 100))"
          />
        </div>`;
      });

      // Process the rest through markdown (without the images)
      const textWithoutImages = processedContent.replace(imageRegex, '');
      if (textWithoutImages.trim()) {
        const markdownText = marked.parse(textWithoutImages);
        processedContent = processedContent.replace(textWithoutImages, markdownText);
      }

      console.log('[MessageBubble] Final processed content:', processedContent.substring(0, 300) + '...');
      return processedContent;
    }

    // Regular markdown processing for non-image content
    return marked.parse(message.text);
  })() : message.text;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 animate-message-enter`}>
      <div className={`${isVideoResult ? 'max-w-full w-full' : 'max-w-xs lg:max-w-md'}`}>
        {!isUser && (
          <div className="flex items-center mb-2">
            <div className="w-3 h-3 rounded-full mr-2 animate-pulse shadow-lg"
                 style={{
                   backgroundColor: 'var(--chimera-matrix-green)',
                   boxShadow: '0 0 8px var(--chimera-matrix-green)'
                 }}>
            </div>
            <span className="text-xs font-orbitron font-medium text-chimera-matrix">{personaName}</span>
          </div>
        )}

        {isVideoResult && message.videoData ? (
          // Render video search results
          <div className="video-message-container">
            <VideoSearchResults data={message.videoData} />
            <div className="mt-2 text-xs text-gray-400 opacity-70">
              {message.timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        ) : (
          // Render regular text message
          <div
            className={`p-4 font-inter ${
              isUser
                ? 'floating-card-user'
                : 'floating-card'
            }`}
            style={{
              backgroundColor: !isUser && personaColor ? `${personaColor}10` : undefined,
              borderColor: !isUser && personaColor ? `${personaColor}40` : undefined,
            }}
          >
            {!isVideoResult ? (
              <div
                className={`prose prose-invert prose-p:before:content-none prose-p:after:content-none prose-img:max-w-full prose-img:h-auto prose-img:rounded-lg prose-img:shadow-lg prose-img:border prose-img:border-primary/20 prose-img:my-4 whitespace-pre-wrap break-words ${isUser ? 'text-chimera-primary' : 'text-chimera-primary'}`}
                dangerouslySetInnerHTML={{ __html: processedText }}
              />
            ) : (
              <p className={`whitespace-pre-wrap break-words ${isUser ? 'text-chimera-primary' : 'text-chimera-primary'}`}>
                {message.text}
              </p>
            )}
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-chimera-secondary opacity-70">
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
              {!isUser && (
                <TTSControls
                  text={message.text}
                  personaTraits={personaTraits}
                  voiceId={voiceId}
                  className="ml-2"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}