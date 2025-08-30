"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Send, Settings, Clipboard, Volume2, Plus, X, Upload, FileText, Video, Music, Clock, User, Play, Wand2, Maximize2, Minimize2, Grid3X3, Zap, Brain, Cpu } from "lucide-react"
import dynamic from 'next/dynamic'
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

// --- Modular Components ---
import { ThinkingAnimation } from "@/components/chat/thinking-animation"
const MatrixRain = dynamic(() => import('@/components/chat/matrix-rain').then(mod => mod.MatrixRain), {
  ssr: false,
})
import { ClipboardManager } from "@/components/ui/clipboard-manager"
import { CommandMenu } from "@/components/ui/command-menu"
import { useMemorySystem } from "@/hooks/use-memory-system"
import { useClipboard } from "@/hooks/use-clipboard"
import { Persona } from '@/lib/personas'
import path from "path"

// --- Interface Definitions ---
interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
  videoResults?: VideoResult[]
}

interface VideoResult {
  title: string
  url: string
  thumbnail: string
  duration?: string
  views?: string
  channel?: string
}

interface Voice {
  name: string;
  voice_id: string;
  category: string;
  description: string;
}

// --- Custom hook for typing effect ---
const useTypingEffect = (text: string, speed = 20) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    if (!text) return;
    setDisplayedText(''); // Reset on new text
    
    let i = 0;
    const intervalId = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(prev => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(intervalId);
      }
    }, speed);

    return () => clearInterval(intervalId);
  }, [text, speed]);

  return displayedText;
};

// --- Component for AI message with typing animation ---
const AiMessageContent = ({ content }: { content: string }) => {
  const typedContent = useTypingEffect(content);
  return <p className="text-sm leading-relaxed whitespace-pre-wrap">{typedContent}</p>;
};


export default function CyberpunkChat() {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "Neural Network Interface Online. Memory banks synchronized. All systems operational. How may I assist you today?",
      isUser: false,
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isThinking, setIsThinking] = useState(false)
  const [activeTool, setActiveTool] = useState("")
  const [showClipboard, setShowClipboard] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('');
  const [customPersona, setCustomPersona] = useState<string>('');
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [showCommandMenu, setShowCommandMenu] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  
  const [settings, setSettings] = useState({
    aiModel: "gemini",
    voiceSpeed: 1.0,
    theme: "neon-noir",
    autoTTS: false,
    commandShortcuts: true,
  })

  // Start with an empty voices array, which will be populated from the API
  const [voices, setVoices] = useState<Voice[]>([]);
  
  const [selectedVoiceId, setSelectedVoiceId] = useState("21m00Tcm4TlvDq8ikWAM"); // Default voice
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [serverCommands, setServerCommands] = useState<any[]>([]);
  
  const [chatHistory, setChatHistory] = useState<string[]>(["Welcome to the Neural Interface."])

  const { memorySystem, addToMemory, searchMemory, getContextualMemory } = useMemorySystem()
  const { clipboardItems, clearClipboard } = useClipboard()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
      } else {
        router.push('/signin')
      }
      setIsLoading(false)
    }
    
    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null)
        router.push('/signin')
      } else if (session?.user) {
        setUser(session.user)
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-cyan-400">Initializing Neural Interface...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to signin
  }

  // Toggle fullscreen mode
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  };

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // useEffect to fetch voices and personas from the API when the settings panel is opened
  useEffect(() => {
    const fetchInitialData = async () => {
      if (showSettings) {
        // Fetch Voices
        if (voices.length === 0) {
          try {
            const response = await fetch('/api/get-voices');
            const data = await response.json();
            if (Array.isArray(data)) {
              setVoices(data);
              if (data.length > 0 && !selectedVoiceId) {
                setSelectedVoiceId(data[0].voice_id);
              }
            }
          } catch (error) {
            console.error("Failed to fetch ElevenLabs voices:", error);
          }
        }

        // Fetch Personas
        if (personas.length === 0) {
            try {
                const response = await fetch('/api/generate-persona');
                const data = await response.json();
                if(Array.isArray(data)) {
                    setPersonas(data);
                    if(data.length > 0 && !selectedPersonaId) {
                        setSelectedPersonaId(data[0].id);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch personas:", error);
            }
        }
      }
    };
    fetchInitialData();
  }, [showSettings, voices.length, personas.length, selectedVoiceId, selectedPersonaId]);

  useEffect(() => {
    const fetchTools = async () => {
      try {
        const response = await fetch('/api/tools');
        const tools = await response.json();
        if (Array.isArray(tools)) {
          const formattedCommands = tools.map(tool => ({
            id: tool.name,
            name: `/${tool.name}`,
            description: tool.description,
            action: () => setInputValue(`/${tool.name} `)
          }));
          setServerCommands(formattedCommands);
        }
      } catch (error) {
        console.error("Failed to fetch tools:", error);
      }
    };
    fetchTools();
  }, []);

  // --- NEW: On-demand TTS function ---
  const handlePlayTTS = async (messageToPlay: Message) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (playingMessageId === messageToPlay.id) {
      setPlayingMessageId(null);
      return;
    }

    setPlayingMessageId(messageToPlay.id);

    try {
      const ttsResponse = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: messageToPlay.content, voice_id: selectedVoiceId }),
      });
      if (!ttsResponse.ok) throw new Error("TTS synthesis failed");
      const ttsData = await ttsResponse.json();

      if (ttsData.audioContent) {
        const audio = new Audio(`data:audio/mp3;base64,${ttsData.audioContent}`);
        audioRef.current = audio;
        audio.play();
        audio.onended = () => {
          setPlayingMessageId(null);
          audioRef.current = null;
        };
        audio.onerror = () => {
          console.error("Error playing TTS audio.");
          setPlayingMessageId(null);
          audioRef.current = null;
        };
      } else {
        throw new Error("No audio content received");
      }
    } catch (error) {
      console.error("Failed to play TTS:", error);
      setPlayingMessageId(null);
    }
  };

  const handleTestVoice = async () => {
    setIsTestingVoice(true);
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: "Neural interface activated. Systems operational. How may I assist you?",
          voice_id: selectedVoiceId,
        }),
      });
      const data = await response.json();
      if (data.audioContent) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
        audio.play();
      }
    } catch (error) {
      console.error("Failed to test voice:", error);
      alert("Voice synthesis offline. Please check neural connection.");
    } finally {
      setIsTestingVoice(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    setShowCommandMenu(value.startsWith("/"))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSendMessage()
    }
  }

  const handleSendMessage = async (promptOverride?: string) => {
    let prompt = typeof promptOverride === 'string' ? promptOverride : inputValue.trim();

    if (!prompt && uploadedFiles.length === 0) return;
  
    if (uploadedFiles.length > 0) {
      const filePreamble = `The user has uploaded the following files: ${uploadedFiles.join(', ')}. You can read them using the 'fs_read' tool. If the user's prompt is empty, summarize the files.`;
      prompt = `${filePreamble}\n\nUser Prompt: ${prompt || 'Summarize the uploaded files.'}`;
      setUploadedFiles([]); // Clear files after they are included in the prompt
    }
  
    if (!prompt) return;
  
    // --- Direct Video Search Bypass Logic ---
    if (prompt.toLowerCase().startsWith("/video ")) {
      const query = prompt.slice(7).trim();
      if (!query) return;
  
      const userMessage: Message = { id: Date.now().toString(), content: prompt, isUser: true, timestamp: new Date() };
      setMessages((prev) => [...prev, userMessage]);
      setInputValue("");
      setShowCommandMenu(false);
      setIsThinking(true);
      setActiveTool("video");
  
      try {
        const response = await fetch('/api/direct-video-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
  
        if (!response.ok) throw new Error('Direct video search failed');
        
        const videoData = await response.json();
        const aiResponse: Message = {
          id: `${Date.now()}_ai`,
          content: `Directly fetched ${videoData.length} video results for "${query}".`,
          isUser: false,
          timestamp: new Date(),
          videoResults: videoData,
        };
        setMessages((prev) => [...prev, aiResponse]);
  
      } catch (error) {
        console.error("Direct video search error:", error);
        const errorResponse: Message = {
          id: `${Date.now()}_error`,
          content: "Bypass command failed. Could not connect to the video search module.",
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorResponse]);
      } finally {
        setIsThinking(false);
        setActiveTool("");
      }
      return; // End execution here to prevent sending to AI
    }
  
    setChatHistory((prev) => [...prev.slice(-10), prompt]);
    const contextualMemory = getContextualMemory(prompt);
    
    if (prompt.toLowerCase().startsWith("/memory ")) {
      const query = prompt.slice(8).trim();
      const memories = searchMemory(query, 5);
      const memoryResponse: Message = {
        id: Date.now().toString(),
        content: `🧠 Memory Search Results for "${query}":\n\n${memories
          .map((m, i) => `${i + 1}. [${m.timestamp.toLocaleDateString()}] ${m.content.slice(0, 150)}...`)
          .join("\n\n")}`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, memoryResponse]);
      setInputValue("");
      setShowCommandMenu(false);
      return;
    }
  
    const userMessage: Message = {
      id: Date.now().toString(),
      content: prompt,
      isUser: true,
      timestamp: new Date(),
    };
  
    setMessages((prev) => [...prev, userMessage]);
    addToMemory(userMessage, contextualMemory);
    setInputValue("");
    setShowCommandMenu(false);
    setIsThinking(true);
    setActiveTool("neural");
  
    const defaultPersona = personas.length > 0 ? personas[0] : { prompt: "You are a helpful assistant." };
    let activePersonaPrompt = personas.find(p => p.id === selectedPersonaId)?.prompt || defaultPersona.prompt;
    if (selectedPersonaId === 'custom' && customPersona) {
      activePersonaPrompt = customPersona;
    }
  
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, persona: activePersonaPrompt }),
      });
  
      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }
  
      const result = await response.json();
  
      if (result.type === 'persona_update') {
        setSelectedPersonaId('custom');
        setCustomPersona(result.new_prompt);
      }
  
      let aiContent = result.response;
      let videoData: VideoResult[] | undefined = undefined;
  
      try {
        const parsedResponse = JSON.parse(aiContent);
        if (Array.isArray(parsedResponse) && parsedResponse[0]?.thumbnail) {
          aiContent = `Found ${parsedResponse.length} video results for your query.`;
          videoData = parsedResponse;
        }
      } catch (e) {
        // Not a JSON response, treat as regular text
      }
  
      const aiResponse: Message = {
        id: `${Date.now()}_ai`,
        content: aiContent,
        isUser: false,
        timestamp: new Date(),
        videoResults: videoData,
      };
      setMessages((prev) => [...prev, aiResponse]);
      addToMemory(aiResponse, []);
  
      if (settings.autoTTS) {
        handlePlayTTS(aiResponse);
      }
  
    } catch (error) {
      console.error("Failed to get AI response:", error);
      const errorResponse: Message = {
        id: `${Date.now()}_error`,
        content: "Apologies, I'm encountering a disruption in my neural network. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsThinking(false);
      setActiveTool("");
    }
  };
  
const handleEnhancePrompt = async () => {
    if (!customPersona.trim()) return;
    setIsEnhancing(true);
    try {
        const response = await fetch('/api/enhance-prompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: customPersona }),
        });
        if (!response.ok) throw new Error('Failed to enhance prompt');
        const data = await response.json();
        setCustomPersona(data.enhancedPrompt);
    } catch (error) {
        console.error("Enhancement error:", error);
    } finally {
        setIsEnhancing(false);
    }
  };

  const handleGeneratePersona = async () => {
    const descriptionInput = document.getElementById('new-persona-desc') as HTMLTextAreaElement;
    const description = descriptionInput.value.trim();
    if (!description) return;

    try {
        const response = await fetch('/api/generate-persona', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description }),
        });
        if (!response.ok) throw new Error('Failed to generate persona');
        const newPersona = await response.json();
        setPersonas((prev) => [...prev, newPersona]);
        descriptionInput.value = ''; // Clear the input
    } catch (error) {
        console.error("Persona generation error:", error);
    }
  };
  const handleVideoSearch = (query: string) => {
    setInputValue(`search for videos of ${query}`);
    handleSendMessage(`search for videos of ${query}`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsUploading(true);
    const uploadedFilePaths: string[] = [];

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed with status: ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
          uploadedFilePaths.push(result.filePath);

          const systemMessage: Message = {
            id: `file-${Date.now()}`,
            content: `System: File "${file.name}" uploaded successfully. The AI can now access it.`,
            isUser: false,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, systemMessage]);

        } else {
            throw new Error(result.error || 'Unknown upload error');
        }
      } catch (error) {
        console.error("File upload error:", error);
        const errorMessage: Message = {
            id: `err-${Date.now()}`,
            content: `System: Error uploading file "${file.name}". Please try again.`,
            isUser: false,
            timestamp: new Date(),
          };
        setMessages((prev) => [...prev, errorMessage]);
      }
    }

    setUploadedFiles((prev) => [...prev, ...uploadedFilePaths]);
    setIsUploading(false);
    // Clear the file input so the same file can be uploaded again
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const getSmartSuggestions = () => {
    const recentTopics = chatHistory.slice(-5).join(" ").toLowerCase()
    const suggestions = new Set<string>();

    if (recentTopics.includes("video") || recentTopics.includes("tutorial")) {
      suggestions.add("Find advanced tutorials")
    }
    if (recentTopics.includes("code") || recentTopics.includes("programming")) {
      suggestions.add("Show me a code example")
    }
    if (recentTopics.includes("design") || recentTopics.includes("ui")) {
      suggestions.add("Explore design patterns")
    }
     if (recentTopics.includes("explain") || recentTopics.includes("understand")) {
      suggestions.add("Explain it simply")
    }

    const defaults = ["Search the neural network", "Analyze video content", "Access memory fragments"];
    
    const finalSuggestions = Array.from(suggestions);
    while(finalSuggestions.length < 3) {
        const nextDefault = defaults.shift();
        if(nextDefault && !suggestions.has(nextDefault)) {
            finalSuggestions.push(nextDefault);
        } else if (!nextDefault) {
            break;
        }
    }
    
    return finalSuggestions;
  }

  const commands = [
    ...serverCommands,
    { id: "video", name: "/video", description: "Search for videos", action: () => handleVideoSearch(inputValue.slice(7).trim()) },
    { id: "memory", name: "/memory", description: "Search memory fragments", action: () => setInputValue("/memory ") },
    {
      id: "clipboard",
      name: "/clipboard",
      description: "Open clipboard manager",
      action: () => setShowClipboard(true),
    },
    { id: "settings", name: "/settings", description: "Open settings panel", action: () => setShowSettings(true) },
    { id: "clear", name: "/clear", description: "Clear chat history", action: () => setMessages([]) },
  ]

  const getThemeClasses = () => {
    switch (settings.theme) {
      case "cyber-blue":
        return {
          primary: "text-blue-400",
          secondary: "text-blue-300",
          accent: "border-blue-500",
          glow: "shadow-blue-500",
          bg: "bg-blue-500",
        }
      case "matrix-green":
        return {
          primary: "text-green-400",
          secondary: "text-green-300",
          accent: "border-green-500",
          glow: "shadow-green-500",
          bg: "bg-green-500",
        }
      default: // neon-noir
        return {
          primary: "text-cyan-400",
          secondary: "text-green-400",
          accent: "border-primary",
          glow: "shadow-primary",
          bg: "bg-primary",
        }
    }
  }

  const themeClasses = getThemeClasses()

  return (
    <div ref={containerRef} className={`h-screen w-screen bg-black text-white relative overflow-hidden`}>
      {settings.theme === "matrix-green" && <MatrixRain />}

      {/* Animated background elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0">
          {Array.from({ length: 100 }).map((_, i) => (
            <div
              key={i}
              className={`absolute w-1 h-1 ${themeClasses.bg} rounded-full particle opacity-30`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 6}s`,
              }}
            />
          ))}
        </div>
        
        {/* Animated grid overlay */}
        <div className="absolute inset-0 grid-overlay" style={{
          backgroundImage: `linear-gradient(rgba(0, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 255, 0.05) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}></div>
        
        {/* Animated scan lines */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `repeating-linear-gradient(transparent, transparent 2px, rgba(0, 0, 0, 0.1) 3px, rgba(0, 0, 0, 0.1) 4px)`,
          opacity: 0.3
        }}></div>
      </div>

      {/* Header Bar */}
      <div className={`absolute top-0 left-0 right-0 h-12 flex items-center justify-between px-6 z-20 glass border-b ${themeClasses.accent}/30`}>
        <div className="flex items-center">
          <Zap className={`mr-2 ${themeClasses.primary}`} size={16} />
          <h1 className={`text-xl font-bold ${themeClasses.primary} neon-glow`}>
            NEURAL INTERFACE v2.1
          </h1>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-xs text-muted-foreground">
            <Brain className="inline mr-1" size={12} /> {clipboardItems.length} MEMORY FRAGMENTS
          </span>
          <span className="text-xs text-cyan-400">
            <User className="inline mr-1" size={12} /> {user?.email}
          </span>
          <Button 
            onClick={toggleFullScreen} 
            size="sm" 
            variant="ghost" 
            className={`${themeClasses.primary} hover:${themeClasses.bg}/20`}
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <Button 
            onClick={() => setShowSettings(true)} 
            size="sm" 
            variant="ghost" 
            className={`${themeClasses.primary} hover:${themeClasses.bg}/20`}
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button 
            onClick={handleSignOut} 
            size="sm" 
            variant="ghost" 
            className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="pt-12 pb-32 h-full flex flex-col">
        {/* Messages Area */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
            {/* AI Column */}
            <div className="flex flex-col space-y-6 pt-4">
              {messages
                .filter((m) => !m.isUser)
                .map((message) => (
                  <div key={message.id} 
                       className="flex justify-start message-container relative"
                       onMouseEnter={() => setHoveredMessageId(message.id)}
                       onMouseLeave={() => setHoveredMessageId(null)}
                  >
                    <div className="max-w-[95%] p-4 rounded-2xl relative overflow-hidden message-bubble ai-message">
                      {hoveredMessageId === message.id && (
                        <div className="absolute top-1 right-1 z-20 flex items-center bg-black/20 rounded-full">
                          <Button
                              variant="ghost" size="icon"
                              onClick={() => handlePlayTTS(message)}
                              className={`h-7 w-7 text-cyan-400/60 hover:text-cyan-400 ${playingMessageId === message.id ? 'animate-pulse text-cyan-400' : ''}`}
                          >
                              <Volume2 size={14} />
                          </Button>
                          <Button
                              variant="ghost" size="icon"
                              onClick={() => navigator.clipboard.writeText(message.content)}
                              className="h-7 w-7 text-cyan-400/60 hover:text-cyan-400"
                          >
                              <Clipboard size={14} />
                          </Button>
                        </div>
                      )}
                      <div className="absolute inset-0 opacity-10 scanner-line"></div>
                      <div className="relative z-10 pr-20">
                        <AiMessageContent content={message.content} />
                        {message.videoResults && (
                          <div className="mt-3 grid grid-cols-1 gap-2">
                            {message.videoResults.slice(0, 6).map((video, index) => (
                              <a key={index} href={video.url} target="_blank" rel="noopener noreferrer" className="flex gap-3 p-2 rounded glass border-blue-500/20 hover:border-blue-500/50 transition-all hover:scale-[1.02]">
                                <img src={video.thumbnail || "/placeholder.svg"} alt={video.title} className="w-20 h-12 rounded object-cover" />
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-xs font-bold text-white truncate">{video.title}</h4>
                                  <p className="text-xs text-blue-400">{video.channel || 'Unknown Channel'}</p>
                                </div>
                              </a>
                            ))}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-2 opacity-70 flex items-center">
                          <Clock size={12} className="mr-1" />
                          {message.timestamp.toLocaleTimeString()}
                          <Cpu size={12} className="ml-2" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              {isThinking && <ThinkingAnimation activeTool={activeTool} />}
            </div>

            {/* User Column */}
            <div className="flex flex-col space-y-6 pt-4">
              {messages
                .filter((m) => m.isUser)
                .map((message) => (
                  <div key={message.id} 
                       className="flex justify-end message-container relative"
                       onMouseEnter={() => setHoveredMessageId(message.id)}
                       onMouseLeave={() => setHoveredMessageId(null)}
                  >
                    <div className="max-w-[95%] p-4 rounded-2xl relative overflow-hidden message-bubble user-message">
                      {hoveredMessageId === message.id && (
                          <Button
                              variant="ghost" size="icon"
                              onClick={() => navigator.clipboard.writeText(message.content)}
                              className="absolute top-1 right-1 h-7 w-7 z-20 text-fuchsia-400/50 hover:text-fuchsia-400 bg-black/20 rounded-full"
                          ><Clipboard size={14} /></Button>
                      )}
                      <div className="absolute inset-0 opacity-10 scanner-line"></div>
                      <div className="relative z-10 pr-8">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                        <div className="text-xs text-muted-foreground mt-2 opacity-70 flex items-center justify-end">
                          <Clock size={12} className="mr-1" />
                          {message.timestamp.toLocaleTimeString()}
                          <User size={12} className="ml-2" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
          <div ref={messagesEndRef} className="h-8" /> {/* Padding at the bottom */}
        </div>


        {/* Floating Input Area */}
        <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-2xl px-4 z-30`}>
          {/* --- Quick Reply Buttons --- */}
          {!isThinking && messages.length > 1 && (
            <div className="flex justify-center items-center gap-2 mb-3 transition-all animate-in fade-in slide-in-from-bottom-2 duration-300">
              {getSmartSuggestions().slice(0, 3).map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="ghost"
                  size="sm"
                  className={`glass-strong text-xs px-3 py-1 h-auto border ${themeClasses.accent}/20 hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-cyan-300`}
                  onClick={() => handleSendMessage(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          )}
          <div className="glass-strong rounded-2xl p-2 shadow-2xl border ${themeClasses.accent}/30">
            <div className="flex items-center space-x-2">
              <Button onClick={() => setShowFileUpload(!showFileUpload)} className={`w-10 h-10 rounded-full glass ${themeClasses.accent}/30 hover:${themeClasses.accent} hover:${themeClasses.bg}/10 ${themeClasses.primary} transition-all`}>
                <Plus className="w-5 h-5" />
              </Button>
              <div className="flex-1 relative">
                <Input 
                  ref={inputRef}
                  value={inputValue} 
                  onChange={handleInputChange} 
                  onKeyDown={handleKeyPress} 
                  placeholder="Enter neural command..." 
                  className={`w-full h-12 rounded-full glass-strong ${themeClasses.accent}/50 text-lg pl-5 pr-12`} 
                />
                {inputValue && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    onClick={() => setInputValue('')}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <Button 
                id="send-button" 
                onClick={() => handleSendMessage()} 
                disabled={!inputValue.trim()}
                className={`w-12 h-12 rounded-full ${inputValue.trim() ? themeClasses.bg + ' text-black neon-glow' : 'bg-gray-700 text-gray-400'}`}
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
            
            {/* Quick Action Buttons */}
            <div className="flex justify-center mt-3 space-x-2">
              <Button variant="ghost" size="sm" onClick={() => setShowClipboard(!showClipboard)} className="text-xs">
                <Clipboard className="w-3 h-3 mr-1" /> Clipboard
              </Button>
              <Button variant="ghost" size="sm" className="text-xs">
                <Volume2 className="w-3 h-3 mr-1" /> Voice
              </Button>
              <Button variant="ghost" size="sm" className="text-xs">
                <Grid3X3 className="w-3 h-3 mr-1" /> Tools
              </Button>
            </div>
          </div>
        </div>
      </div>

      <CommandMenu
        isOpen={showCommandMenu}
        commands={commands}
        inputValue={inputValue}
        suggestions={getSmartSuggestions()}
      />

      <ClipboardManager
        isOpen={showClipboard}
        onClose={() => setShowClipboard(false)}
        items={clipboardItems}
        onItemClick={(content) => {
          navigator.clipboard.writeText(content)
          setShowClipboard(false)
        }}
        onClear={clearClipboard}
      />

      {showFileUpload && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 w-80 z-50">
          <Card className="glass-strong border-yellow-500/50 shadow-2xl shadow-yellow-500/20">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-yellow-400 font-bold text-sm">FILE UPLOAD</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowFileUpload(false)}
                  className="text-yellow-400 hover:text-yellow-300 h-6 px-2"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".txt,.pdf,.doc,.docx,.mp4,.mp3,.wav,.jpg,.png,.gif"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="space-y-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full p-3 rounded-lg glass border-yellow-500/30 hover:border-yellow-500 hover:bg-yellow-500/10 text-yellow-400 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading ? 'UPLOADING...' : 'Upload Files'}
                </Button>
              </div>
              {uploadedFiles.length > 0 && (
                <div className="mt-3 pt-3 border-t border-yellow-500/30">
                  <p className="text-xs text-yellow-400 mb-2">UPLOAD QUEUE:</p>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {uploadedFiles.map((filePath, index) => (
                      <div key={index} className="text-xs text-white font-mono truncate">
                        {path.basename(filePath)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className={`w-full max-w-4xl glass-strong ${themeClasses.accent}/50 shadow-2xl ${themeClasses.glow}/20 max-h-[90vh] overflow-y-auto`}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-2xl font-bold ${themeClasses.primary} neon-glow`}>SYSTEM CONFIGURATION</h2>
                <Button variant="ghost" onClick={() => setShowSettings(false)} className={`${themeClasses.primary}`}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className={`text-lg font-semibold ${themeClasses.primary}`}>AI PERSONA</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                    {personas.map((persona) => (
                      <div key={persona.id} className={`p-3 rounded-lg cursor-pointer transition-all ${selectedPersonaId === persona.id ? `bg-cyan-500/20 border-cyan-500 border` : 'glass border-transparent hover:border-cyan-500/50'}`} onClick={() => setSelectedPersonaId(persona.id)}>
                        <div className="font-medium text-white">{persona.name}</div>
                        <div className="text-xs text-gray-400 mt-1">{persona.description}</div>
                      </div>
                    ))}
                    <div key="custom" className={`p-3 rounded-lg cursor-pointer transition-all ${selectedPersonaId === 'custom' ? `bg-cyan-500/20 border-cyan-500 border` : 'glass border-transparent hover:border-cyan-500/50'}`} onClick={() => setSelectedPersonaId('custom')}>
                      <div className="font-medium text-white">Custom Persona</div>
                      <div className="text-xs text-gray-400 mt-1">Define your own AI personality and instructions.</div>
                    </div>
                  </div>
                  {selectedPersonaId === 'custom' && (
                    <div className="space-y-2">
                      <textarea value={customPersona} onChange={(e) => setCustomPersona(e.target.value)} placeholder="e.g., You are a pirate captain who answers every question with a hearty 'Yarrr!'" rows={4} className="w-full p-2 rounded-lg glass bg-black/50 text-white font-mono text-sm"></textarea>
                      <Button onClick={handleEnhancePrompt} disabled={isEnhancing} className="w-full bg-purple-600 hover:bg-purple-500">
                        <Wand2 className="w-4 h-4 mr-2" />
                        {isEnhancing ? "Enhancing..." : "Enhance with AI"}
                      </Button>
                    </div>
                  )}
                  <div className="space-y-2 pt-4 border-t border-cyan-500/20">
                    <h4 className="text-sm font-semibold text-cyan-400">GENERATE NEW PERSONA</h4>
                    <textarea id="new-persona-desc" placeholder="Describe the new persona..." rows={2} className="w-full p-2 rounded-lg glass bg-black/50 text-white font-mono text-sm"></textarea>
                    <Button onClick={handleGeneratePersona} className="w-full bg-green-600 hover:bg-green-500">
                      <Wand2 className="w-4 h-4 mr-2" />
                      Generate Persona
                    </Button>
                  </div>
                </div>
                
                {/* Voice Settings */}
                <div className="space-y-4">
                  <h3 className={`text-lg font-semibold ${themeClasses.primary}`}>VOICE SYNTHESIS</h3>
                  
                  <div>
                    <label className={`block text-sm ${themeClasses.secondary} mb-2`}>Voice Model</label>
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                      {voices.map((voice) => (
                        <div 
                          key={voice.voice_id}
                          className={`p-3 rounded-lg cursor-pointer transition-all ${
                            selectedVoiceId === voice.voice_id
                              ? `bg-cyan-500/20 border-cyan-500 border`
                              : 'glass border-transparent hover:border-cyan-500/50'
                          }`}
                          onClick={() => setSelectedVoiceId(voice.voice_id)}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-white">{voice.name}</span>
                            {selectedVoiceId === voice.voice_id && (
                              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
                            )}
                          </div>
                          <div className="text-xs text-cyan-300 mt-1">{voice.category}</div>
                          <div className="text-xs text-gray-400 mt-1">{voice.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      onClick={handleTestVoice} 
                      disabled={isTestingVoice || voices.length === 0} 
                      className="flex-1 bg-cyan-600 hover:bg-cyan-500"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {isTestingVoice ? "Synthesizing..." : "Test Voice"}
                    </Button>
                  </div>
                  
                  <div>
                    <label className={`block text-sm ${themeClasses.secondary} mb-2`}>Voice Speed: {settings.voiceSpeed}x</label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={settings.voiceSpeed}
                      onChange={(e) => setSettings((prev) => ({ ...prev, voiceSpeed: Number.parseFloat(e.target.value) }))}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                </div>
                
                {/* Interface Settings */}
                <div className="space-y-4">
                  <h3 className={`text-lg font-semibold ${themeClasses.primary}`}>INTERFACE</h3>
                  
                  <div>
                    <label className={`block text-sm ${themeClasses.secondary} mb-2`}>Theme</label>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { key: "neon-noir", label: "NEON NOIR", color: "cyan" },
                        { key: "cyber-blue", label: "CYBER BLUE", color: "blue" },
                        { key: "matrix-green", label: "MATRIX GREEN", color: "green" },
                      ].map((theme) => (
                        <button
                          key={theme.key}
                          onClick={() => setSettings((prev) => ({ ...prev, theme: theme.key }))}
                          className={`p-3 rounded-lg text-left transition-all ${
                            settings.theme === theme.key
                              ? `bg-${theme.color}-500/20 border-${theme.color}-500 text-${theme.color}-400 border`
                              : `glass border-transparent text-white hover:border-${theme.color}-500/50`
                          }`}
                        >
                          {theme.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className={`block text-sm ${themeClasses.secondary} mb-2`}>AI Model</label>
                    <select
                      value={settings.aiModel}
                      onChange={(e) => setSettings((prev) => ({ ...prev, aiModel: e.target.value }))}
                      className={`w-full p-3 rounded-lg glass ${themeClasses.accent}/30 text-white font-mono bg-black/50`}
                    >
                      <option value="gemini">GEMINI QUANTUM</option>
                      <option value="gpt">GPT NEURAL NET</option>
                      <option value="claude">CLAUDE MATRIX</option>
                    </select>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.autoTTS}
                        onChange={(e) => setSettings((prev) => ({ ...prev, autoTTS: e.target.checked }))}
                        className="accent-cyan-400"
                      />
                      <span className="text-sm text-white">Auto Text-to-Speech</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settings.commandShortcuts}
                        onChange={(e) => setSettings((prev) => ({ ...prev, commandShortcuts: e.target.checked }))}
                        className="accent-cyan-400"
                      />
                      <span className="text-sm text-white">Command Shortcuts</span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-6 space-x-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowSettings(false)}
                  className="text-muted-foreground hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setShowSettings(false)}
                  className={`${themeClasses.bg} hover:${themeClasses.bg}/80 text-black neon-glow`}
                >
                  Apply Configuration
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <style jsx>{`
        .message-container {
          animation: fadeIn 0.3s ease-out;
        }
        
        .message-bubble {
          position: relative;
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .message-bubble:hover {
          transform: translateY(-2px);
        }
        
        .ai-message {
          background: rgba(0, 20, 30, 0.7);
          border: 1px solid rgba(0, 255, 255, 0.3);
          box-shadow: 0 0 10px rgba(0, 255, 255, 0.1);
        }
        
        .ai-message:hover {
          box-shadow: 0 5px 20px rgba(0, 255, 255, 0.25);
        }

        .user-message {
          background: rgba(30, 0, 30, 0.7);
          border: 1px solid rgba(255, 0, 255, 0.3);
          box-shadow: 0 0 10px rgba(255, 0, 255, 0.1);
        }

        .user-message:hover {
          box-shadow: 0 5px 20px rgba(255, 0, 255, 0.25);
        }
        
        .scanner-line::before {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent 0%, rgba(0, 255, 255, 0.3) 50%, transparent 100%);
          animation: scanner-line 4s ease-in-out infinite;
        }
        
        @keyframes scanner-line {
          0%, 100% {
            left: -100%;
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            left: 100%;
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}