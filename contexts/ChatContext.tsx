'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { VideoSearchData } from '@/components/ui/video-results';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  contentType?: 'text' | 'video_search';
  videoData?: VideoSearchData;
}

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  lastUserMessage: string;
  lastPersonaPrompt: string;
}

type ChatAction =
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'SET_LAST_USER_MESSAGE'; payload: string }
  | { type: 'SET_LAST_PERSONA_PROMPT'; payload: string }
  | { type: 'LOAD_PERSISTED_STATE'; payload: ChatState }
  | { type: 'REMOVE_LAST_MESSAGE' };

const initialState: ChatState = {
  messages: [],
  isLoading: false,
  error: null,
  lastUserMessage: '',
  lastPersonaPrompt: '',
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
        error: null,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };
    case 'CLEAR_MESSAGES':
      return {
        ...state,
        messages: [],
        error: null,
        lastUserMessage: '',
        lastPersonaPrompt: '',
      };
    case 'SET_LAST_USER_MESSAGE':
      return {
        ...state,
        lastUserMessage: action.payload,
      };
    case 'SET_LAST_PERSONA_PROMPT':
      return {
        ...state,
        lastPersonaPrompt: action.payload,
      };
    case 'LOAD_PERSISTED_STATE':
      return {
        ...action.payload,
        isLoading: false, // Always reset loading state on load
      };
    case 'REMOVE_LAST_MESSAGE':
      return {
        ...state,
        messages: state.messages.slice(0, -1),
      };
    default:
      return state;
  }
}

interface ChatContextType {
  state: ChatState;
  sendMessage: (text: string, personaPrompt?: string) => Promise<void>;
  clearMessages: () => void;
  retryLastMessage: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const STORAGE_KEY = 'jarvis_chat_state';

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Load persisted state on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedState = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        const messagesWithDates = parsedState.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        dispatch({
          type: 'LOAD_PERSISTED_STATE',
          payload: {
            ...parsedState,
            messages: messagesWithDates,
          },
        });
      }
    } catch (error) {
      console.error('Failed to load persisted chat state:', error);
    }
  }, []);

  // Persist state changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to persist chat state:', error);
    }
  }, [state]);

  const generateMessageId = () => {
    return Date.now().toString() + Math.random().toString(36).substring(2, 11);
  };

  const sendMessage = async (text: string, personaPrompt?: string) => {
    if (!text.trim() || state.isLoading) return;

    const userMessage: Message = {
      id: generateMessageId(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SET_LAST_USER_MESSAGE', payload: text.trim() });
    dispatch({ type: 'SET_LAST_PERSONA_PROMPT', payload: personaPrompt || '' });

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text.trim(),
          persona: personaPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Handle video search results
      let aiMessage: Message;
      if (result.response && typeof result.response === 'object' && result.response.items) {
        aiMessage = {
          id: generateMessageId(),
          text: `Found ${result.response.total_results} video results`,
          sender: 'ai',
          timestamp: new Date(),
          contentType: 'video_search',
          videoData: result.response,
        };
      } else {
        aiMessage = {
          id: generateMessageId(),
          text: typeof result.response === 'string' ? result.response : JSON.stringify(result.response, null, 2),
          sender: 'ai',
          timestamp: new Date(),
        };
      }

      dispatch({ type: 'ADD_MESSAGE', payload: aiMessage });
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: generateMessageId(),
        text: 'Error: Could not connect to J.A.R.V.I.S. core systems. Please check server status.',
        sender: 'ai',
        timestamp: new Date(),
      };
      dispatch({ type: 'ADD_MESSAGE', payload: errorMessage });
      dispatch({ type: 'SET_ERROR', payload: 'Failed to send message' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const retryLastMessage = async () => {
    if (state.lastUserMessage) {
      // Remove the last AI message if it was an error
      const lastMessage = state.messages[state.messages.length - 1];
      if (lastMessage?.sender === 'ai' && lastMessage.text.includes('Error:')) {
        dispatch({ type: 'REMOVE_LAST_MESSAGE' });
      }
      
      await sendMessage(state.lastUserMessage, state.lastPersonaPrompt);
    }
  };

  const clearMessages = () => {
    dispatch({ type: 'CLEAR_MESSAGES' });
  };

  return (
    <ChatContext.Provider value={{
      state,
      sendMessage,
      clearMessages,
      retryLastMessage,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  
  return {
    messages: context.state.messages,
    isLoading: context.state.isLoading,
    error: context.state.error,
    sendMessage: context.sendMessage,
    clearMessages: context.clearMessages,
    retryLastMessage: context.retryLastMessage,
  };
}
