"use client"

import type React from "react"
import { Suspense, useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Send, Settings, Clipboard, Volume2, Plus, X, Upload, FileText, Video, Music, Clock, User, Play, Wand2 } from "lucide-react"
import dynamic from 'next/dynamic'

// --- Modular Components ---
import { ThinkingAnimation } from "@/components/chat/thinking-animation"
const MatrixRain = dynamic(() => import('@/components/chat/matrix-rain').then(mod => mod.MatrixRain), {
  ssr: false,
})
import { ClipboardManager } from "@/components/ui/clipboard-manager"
import { CommandMenu } from "@/components/ui/command-menu"
import { useMemorySystem } from "@/hooks/use-memory-system"
import { useClipboard } from "@/hooks/use-clipboard"
import { personas, Persona } from '@/lib/personas'

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

export default function CyberpunkChat() {
  const [isClient, setIsClient] = useState(false)
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
 const [selectedPersonaId, setSelectedPersonaId] = useState<string>(personas[0].id);
  const [customPersona, setCustomPersona] = useState<string>('');
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [showCommandMenu, setShowCommandMenu] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  
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
  
  const [chatHistory, setChatHistory] = useState<string[]>([])

  const { memorySystem, addToMemory, searchMemory, getContextualMemory } = useMemorySystem()
  const { clipboardItems, clearClipboard } = useClipboard()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setIsClient(true)
  }, [])
  // useEffect to fetch voices from the API when the settings panel is opened
  useEffect(() => {
    if (showSettings && voices.length === 0) {
      const fetchVoices = async () => {
        try {
          const response = await fetch('/api/get-voices');
          const data = await response.json();
          if (Array.isArray(data)) {
            setVoices(data);
            if (data.length > 0) {
              setSelectedVoiceId(data[0].voice_id); // Set default to the first voice in the list
            }
          }
        } catch (error) {
          console.error("Failed to fetch ElevenLabs voices:", error);
        }
      };
      fetchVoices();
    }
  }, [showSettings, voices.length]);

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

  const handleSendMessage = async () => {
    const prompt = inputValue.trim();
    if (!prompt) return;

    // --- NEW: Direct Video Search Bypass Logic ---
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

    let activePersonaPrompt = personas.find(p => p.id === selectedPersonaId)?.prompt || personas[0].prompt;
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
        const ttsResponse = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: aiContent,
            voice_id: selectedVoiceId,
          }),
        });
        const ttsData = await ttsResponse.json();
        if (ttsData.audioContent) {
          const audio = new Audio(`data:audio/mp3;base64,${ttsData.audioContent}`);
          audio.play();
        }
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
  const handleVideoSearch = (query: string) => {
    setInputValue(`search for videos of ${query}`);
    Promise.resolve().then(() => {
        const sendButton = document.getElementById('send-button');
        if (sendButton) {
            sendButton.click();
        } else {
            handleSendMessage();
        }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      setUploadedFiles((prev) => [...prev, ...Array.from(files)])
    }
  }

  const getSmartSuggestions = () => {
    const recentTopics = chatHistory.slice(-5).join(" ").toLowerCase()
    const suggestions = []

    if (recentTopics.includes("video") || recentTopics.includes("tutorial")) {
      suggestions.push("Search for advanced tutorials")
    }
    if (recentTopics.includes("code") || recentTopics.includes("programming")) {
      suggestions.push("Find coding examples")
    }
    if (recentTopics.includes("design") || recentTopics.includes("ui")) {
      suggestions.push("Explore design patterns")
    }

    return suggestions.length > 0
      ? suggestions
      : ["Search the neural network", "Analyze video content", "Access memory fragments"]
  }

  const commands = [
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  return (
    <div className={`min-h-screen bg-black text-white relative overflow-hidden`}>
      {isClient && settings.theme === "matrix-green" && <MatrixRain />}

      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0">
          {Array.from({ length: 50 }).map((_, i) => (
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
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <Card
          className={`w-full max-w-4xl h-[80vh] glass rounded-[25px] border-2 ${themeClasses.accent}/50 shadow-2xl ${themeClasses.glow}/20 flex flex-col`}
        >
          <div className={`p-6 border-b ${themeClasses.accent}/30`}>
            <h1 className={`text-2xl font-bold ${themeClasses.primary} neon-glow text-center`}>
              NEURAL INTERFACE v2.1
            </h1>
            <div className="text-center text-sm text-muted-foreground mt-2">
              <span className="typing-effect">
                QUANTUM_LINK_ESTABLISHED • {clipboardItems.length} MEMORY_FRAGMENTS
              </span>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] p-4 rounded-3xl glass-strong ${message.isUser ? `${themeClasses.accent}` : `border-secondary`}`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    
                    {message.videoResults && (
                      <div className="mt-3 grid grid-cols-1 gap-2">
                        {message.videoResults.slice(0, 5).map((video, index) => (
                          <a key={index} href={video.url} target="_blank" rel="noopener noreferrer" className="flex gap-3 p-2 rounded glass border-blue-500/20 hover:border-blue-500/50">
                            <img src={video.thumbnail || "/placeholder.svg"} alt={video.title} className="w-20 h-12 rounded object-cover" />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-white truncate">{video.title}</h4>
                              <p className="text-xs text-blue-400">{video.channel || 'Unknown Channel'}</p>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground mt-2 opacity-70">{message.timestamp.toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}
              {isThinking && <ThinkingAnimation activeTool={activeTool} />}
            </div>
            <div ref={messagesEndRef} />
          </div>

          <div className={`p-6 border-t ${themeClasses.accent}/30`}>
            <div className="flex items-center space-x-4">
              <Button onClick={() => setShowFileUpload(!showFileUpload)} className={`w-12 h-12 rounded-full glass ${themeClasses.accent}/30 hover:${themeClasses.accent} hover:${themeClasses.bg}/10 ${themeClasses.primary} transition-all`}><Plus className="w-5 h-5" /></Button>
              <div className="flex-1 relative">
                <Input value={inputValue} onChange={handleInputChange} onKeyDown={handleKeyPress} placeholder="Enter neural command..." className={`w-full h-12 rounded-full glass-strong ${themeClasses.accent}/50`} />
              </div>
              <Button id="send-button" onClick={handleSendMessage} className={`w-12 h-12 rounded-full ${themeClasses.bg} text-black neon-glow`}><Send className="w-5 h-5" /></Button>
            </div>
            <div className="flex justify-center mt-4 space-x-4">
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)}><Settings className="w-4 h-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => setShowClipboard(!showClipboard)}><Clipboard className="w-4 h-4" /></Button>
              <Button variant="ghost" size="sm"><Volume2 className="w-4 h-4" /></Button>
            </div>
          </div>
        </Card>

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
          <div className="absolute bottom-36 left-8 w-80 z-50">
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
                    className="w-full p-3 rounded-lg glass border-yellow-500/30 hover:border-yellow-500 hover:bg-yellow-500/10 text-yellow-400"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Files
                  </Button>
                </div>
                {uploadedFiles.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-yellow-500/30">
                    <p className="text-xs text-yellow-400 mb-2">UPLOADED:</p>
                    <div className="space-y-1 max-h-20 overflow-y-auto">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="text-xs text-white font-mono truncate">
                          {file.name}
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
            <Card className={`w-full max-w-2xl glass-strong ${themeClasses.accent}/50 shadow-2xl ${themeClasses.glow}/20`}>
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

      </div>
    </div>
  )
}