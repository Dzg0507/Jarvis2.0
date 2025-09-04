'use client';

import { useState, useCallback, useRef } from 'react';
import { VideoSearchData } from '@/components/ui/video-results';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  contentType?: 'text' | 'video_search';
  videoData?: VideoSearchData;
}

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (text: string, personaPrompt?: string) => Promise<void>;
  clearMessages: () => void;
  retryLastMessage: () => Promise<void>;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastUserMessageRef = useRef<string>('');
  const lastPersonaPromptRef = useRef<string>('');

  const generateMessageId = () => {
    return Date.now().toString() + Math.random().toString(36).substring(2, 11);
  };

  // Function to detect and parse video search results
  const parseVideoSearchResult = (responseText: string): { isVideoResult: boolean; videoData?: VideoSearchData; displayText?: string } => {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(responseText);

      // Check if it's a video search result
      if (parsed.response_type === 'video_search_results' && parsed.content_type === 'json' && parsed.data) {
        return {
          isVideoResult: true,
          videoData: parsed.data
        };
      }
    } catch (error) {
      // Not JSON or parsing failed, treat as regular text
    }

    return {
      isVideoResult: false,
      displayText: responseText
    };
  };

  const sendMessage = useCallback(async (text: string, personaPrompt?: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: generateMessageId(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);
    
    // Store for retry functionality
    lastUserMessageRef.current = text.trim();
    lastPersonaPromptRef.current = personaPrompt || '';

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: text.trim(), 
          persona: personaPrompt 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.statusText}`);
      }

      const result = await response.json();

      // Parse the response to check if it's a video search result
      const parsedResult = parseVideoSearchResult(result.response || '');

      const aiMessage: Message = {
        id: generateMessageId(),
        text: parsedResult.isVideoResult ? 'Video search results' : (parsedResult.displayText || 'Sorry, I encountered an error.'),
        sender: 'ai',
        timestamp: new Date(),
        contentType: parsedResult.isVideoResult ? 'video_search' : 'text',
        videoData: parsedResult.videoData,
      };

      setMessages(prev => [...prev, aiMessage]);

      // Handle persona updates if needed
      if (result.type === 'persona_update') {
        // This would be handled by the parent component
        console.log('Persona update requested:', result.new_prompt);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      
      const errorAiMessage: Message = {
        id: generateMessageId(),
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorAiMessage]);
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const retryLastMessage = useCallback(async () => {
    if (lastUserMessageRef.current) {
      // Remove the last AI message if it was an error
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage?.sender === 'ai' && lastMessage.text.includes('error')) {
          return prev.slice(0, -1);
        }
        return prev;
      });
      
      await sendMessage(lastUserMessageRef.current, lastPersonaPromptRef.current);
    }
  }, [sendMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    lastUserMessageRef.current = '';
    lastPersonaPromptRef.current = '';
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    retryLastMessage,
  };
}