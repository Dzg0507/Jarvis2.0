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

import { useState, useEffect } from 'react';

export default function MessageBubble({
  message,
  personaColor,
  personaName = 'AI',
  personaTraits = [],
  voiceId
}: MessageBubbleProps) {
  const isUser = message.sender === 'user';
  const isVideoResult = message.contentType === 'video_search' && message.videoData;
  const [processedText, setProcessedText] = useState<string>('');

  useEffect(() => {
    const processText = async () => {
      if (isVideoResult) {
        setProcessedText(message.text);
        return;
      }

      marked.setOptions({
        breaks: true,
        gfm: true,
      });

      if (message.text.includes('![') && message.text.includes('data:image')) {
        const imageRegex = /!\[([^\]]*)\]\((data:image\/[^)]+)\)/g;
        let processedContent = message.text;

        processedContent = processedContent.replace(imageRegex, (match, altText, dataUrl) => {
          if (!dataUrl.startsWith('data:image/') || !dataUrl.includes('base64,')) {
            return `<div class="image-error my-4 p-4 border border-red-500/30 rounded-lg bg-red-500/10"><p class="text-red-400 text-sm">❌ Invalid image format</p></div>`;
          }
          return `<div class="image-container my-4" style="display: block; width: 100%; text-align: center;"><img src="${dataUrl}" alt="${altText || 'Generated Image'}" class="generated-image" style="max-width: 100%; max-height: 512px; height: auto; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border: 1px solid rgba(255, 255, 255, 0.2);"/></div>`;
        });

        const textWithoutImages = processedContent.replace(imageRegex, '');
        if (textWithoutImages.trim()) {
          const markdownText = await marked.parse(textWithoutImages);
          processedContent = processedContent.replace(textWithoutImages, markdownText);
        }
        setProcessedText(processedContent);
      } else {
        const parsedText = await marked.parse(message.text);
        setProcessedText(parsedText);
      }
    };

    processText();
  }, [message.text, isVideoResult]);

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
            <div
              className={`prose prose-invert prose-p:before:content-none prose-p:after:content-none prose-img:max-w-full prose-img:h-auto prose-img:rounded-lg prose-img:shadow-lg prose-img:border prose-img:border-primary/20 prose-img:my-4 whitespace-pre-wrap break-words ${isUser ? 'text-chimera-primary' : 'text-chimera-primary'}`}
              dangerouslySetInnerHTML={{ __html: processedText }}
            />
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