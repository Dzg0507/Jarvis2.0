'use client';

import React from 'react';
import { VideoSearchResults } from '@/components/ui/video-results';

interface VideoSearchData {
  query: string;
  total_results: number;
  creator_results_count: number;
  items: Array<{
    title: string;
    video_url: string;
    thumbnail_url: string;
    platform: string;
    is_creator_content: boolean;
    description?: string | null;
    duration?: string | null;
    view_count?: string | null;
  }>;
  search_metadata: {
    primary_search_successful: boolean;
    fallback_search_used: boolean;
    web_search_supplemented: boolean;
  };
  web_search_content?: string;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  contentType?: 'text' | 'video_search';
  videoData?: VideoSearchData;
}

interface MessageBubbleProps {
  message: Message;
  personaColor?: string;
  personaName?: string;
}

export default function MessageBubble({
  message,
  personaName = 'AI'
}: MessageBubbleProps) {
  const isUser = message.sender === 'user';
  const isVideoResult = message.contentType === 'video_search' && message.videoData;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`${isVideoResult ? 'max-w-full w-full' : 'max-w-xs lg:max-w-md'}`}>
        {!isUser && (
          <div className="flex items-center mb-1">
            <div className="w-3 h-3 bg-matrix-green rounded-full mr-2 animate-pulse shadow-lg shadow-matrix-green/50"></div>
            <span className="text-xs text-matrix-green font-orbitron font-medium">{personaName}</span>
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
            className={`px-4 py-2 rounded-lg font-mono ${
              isUser
                ? 'message-user'
                : 'message-ai'
            }`}
          >
            <p className="whitespace-pre-wrap break-words">{message.text}</p>
            <p className={`text-xs mt-1 opacity-70`}>
              {message.timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}