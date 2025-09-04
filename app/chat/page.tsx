'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import OnboardingFlow from '@/components/OnboardingFlow';
import MessageBubble from '@/components/MessageBubble';
import TypingIndicator from '@/components/TypingIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePersonas } from '@/hooks/usePersonas';
import { useChat } from '@/contexts/ChatContext';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Settings } from 'lucide-react';
import WindowControls from '@/components/WindowControls';

export default function ChatPage() {
  const { user, loading, signOut } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { toast } = useToast();

  // Slash commands configuration
  const slashCommands = [
    { command: '/create_image', description: 'Generate an image', example: '/create_image a beautiful sunset' },
    { command: '/search', description: 'Search the web', example: '/search latest AI news' },
    { command: '/video', description: 'Search for videos', example: '/video funny cats' },
    { command: '/note', description: 'Save a note', example: '/note Remember to buy milk' },
    { command: '/calculate', description: 'Perform calculations', example: '/calculate 15 * 24' },
    { command: '/weather', description: 'Get weather info', example: '/weather New York' },
    { command: '/help', description: 'Show available commands', example: '/help' },
    { command: '/clear', description: 'Clear chat history', example: '/clear' },
  ];

  const {
    personas,
    selectedPersonaId,
    customPersona,
    setSelectedPersonaId,
    setCustomPersona,
    getActivePersonaPrompt,
    getPersonaById,
  } = usePersonas();

  const {
    messages,
    isLoading: chatLoading,
    sendMessage,
    clearMessages,
  } = useChat();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      return;
    }

    if (user) {
      checkOnboardingStatus();
    }
  }, [user, loading, router]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkOnboardingStatus = () => {
    const onboardingCompleted = localStorage.getItem('onboarding_completed') === 'true';
    const onboardingSkipped = localStorage.getItem('onboarding_skipped') === 'true';
    
    if (!onboardingCompleted && !onboardingSkipped) {
      setShowOnboarding(true);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || chatLoading) return;

    const personaPrompt = getActivePersonaPrompt();
    await sendMessage(inputValue, personaPrompt);
    setInputValue('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Show slash commands when user types '/'
    if (value === '/' || (value.startsWith('/') && value.length > 1)) {
      setShowSlashCommands(true);
    } else {
      setShowSlashCommands(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    } else if (e.key === 'Escape') {
      setShowSlashCommands(false);
    }
  };

  const handleSlashCommandClick = (command: string, example: string) => {
    setInputValue(example);
    setShowSlashCommands(false);
  };

  const handleOnboardingComplete = (personaId: string) => {
    setSelectedPersonaId(personaId);
    setShowOnboarding(false);
    toast({
      title: "Welcome to AI Chat!",
      description: "You're all set up and ready to start chatting.",
    });
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
    toast({
      title: "Tutorial skipped",
      description: "You can always reset the tutorial from your profile.",
    });
  };

  const getPersonaName = () => {
    if (selectedPersonaId === 'custom') return 'Custom AI';
    const persona = getPersonaById(selectedPersonaId);
    return persona?.name || 'AI Assistant';
  };

  const getPersonaColor = () => {
    if (selectedPersonaId === 'custom') return '#6B7280';
    const persona = getPersonaById(selectedPersonaId);
    return persona?.color || '#4F46E5';
  };

  const getPersonaTraits = () => {
    if (selectedPersonaId === 'custom') return ['helpful', 'custom'];
    const persona = getPersonaById(selectedPersonaId);
    return persona?.personalityTraits || ['helpful'];
  };

  const getPersonaVoiceId = () => {
    if (selectedPersonaId === 'custom') return undefined;
    const persona = getPersonaById(selectedPersonaId);
    return persona?.voiceId;
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="matrix-loading text-2xl font-orbitron mb-4">INITIALIZING J.A.R.V.I.S</div>
          <div className="w-8 h-8 border-2 border-matrix-green border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen chimera-bg relative overflow-hidden">
      {/* Enhanced Matrix Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 opacity-90 z-10" style={{ background: 'var(--deep-space-black)' }}></div>
        <div className="grid-overlay absolute inset-0 z-5 opacity-20"></div>
        {/* Animated Particles */}
        <div className="absolute inset-0 z-5">
          <div className="particles-container">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-matrix-green rounded-full opacity-60 animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${2 + Math.random() * 2}s`
                }}
              />
            ))}
          </div>
        </div>
        {/* Scanlines */}
        <div className="absolute inset-0 z-5 pointer-events-none">
          <div className="scanlines"></div>
        </div>
      </div>

      {showOnboarding && (
        <OnboardingFlow
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}

      <div className="flex flex-col h-screen relative z-20">
        {/* Enhanced Header */}
        <div className="floating-card m-4 mb-0 p-6 border-b-0 rounded-b-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-chimera-matrix font-orbitron">J.A.R.V.I.S</h1>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full pulse-dot shadow-lg"
                     style={{
                       backgroundColor: 'var(--chimera-matrix-green)',
                       boxShadow: '0 0 8px var(--chimera-matrix-green)'
                     }}>
                </div>
                <span className="text-sm font-orbitron text-chimera-cyan">{getPersonaName()}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                className="btn-matrix"
                size="sm"
                onClick={() => router.push('/settings')}
              >
                <Settings className="w-4 h-4 mr-1" />
                Settings
              </Button>
              <Button
                className="btn-matrix"
                size="sm"
                onClick={clearMessages}
              >
                Clear Chat
              </Button>
              <Button
                className="btn-matrix"
                size="sm"
                onClick={handleSignOut}
              >
                Sign Out
              </Button>
              <WindowControls />
            </div>
          </div>
        </div>



        {/* Enhanced Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="text-center mt-12">
              <div className="text-6xl mb-6 animate-pulse">💬</div>
              <p className="font-orbitron text-chimera-matrix text-xl mb-2">Start a conversation with {getPersonaName()}!</p>
              <p className="text-sm text-chimera-secondary">Type a message below to begin.</p>
              <div className="mt-8 flex justify-center space-x-4">
                {['Hello!', 'How are you?', 'Tell me a joke'].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setInputValue(suggestion)}
                    className="floating-card px-4 py-2 text-sm text-chimera-matrix hover:text-chimera-cyan transition-all duration-300 hover:scale-105"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                personaColor={getPersonaColor()}
                personaName={getPersonaName()}
                personaTraits={getPersonaTraits()}
                voiceId={getPersonaVoiceId()}
              />
            ))
          )}
          
          {chatLoading && (
            <TypingIndicator 
              personaName={getPersonaName()}
              personaColor={getPersonaColor()}
            />
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Enhanced Input Area */}
        <div className="floating-card m-4 mt-0 p-6 border-t-0 rounded-t-none">
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              {/* Slash Commands Dropdown */}
              {showSlashCommands && (
                <div className="absolute bottom-full left-0 right-0 mb-2 floating-card border-chimera-matrix/30 max-h-64 overflow-y-auto z-50">
                  <div className="p-2">
                    <div className="text-xs text-chimera-secondary mb-2 font-orbitron">Available Commands:</div>
                    {slashCommands
                      .filter(cmd =>
                        inputValue === '/' ||
                        cmd.command.toLowerCase().includes(inputValue.toLowerCase().slice(1))
                      )
                      .map((cmd, index) => (
                        <div
                          key={index}
                          onClick={() => handleSlashCommandClick(cmd.command, cmd.example)}
                          className="p-3 hover:bg-chimera-matrix/10 cursor-pointer rounded border-l-2 border-transparent hover:border-chimera-matrix transition-all duration-200"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-chimera-matrix font-mono text-sm">{cmd.command}</div>
                              <div className="text-chimera-secondary text-xs">{cmd.description}</div>
                            </div>
                            <div className="text-chimera-secondary text-xs font-mono">{cmd.example}</div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
              <Input
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${getPersonaName()}... (Type / for commands)`}
                disabled={chatLoading}
                className="floating-card bg-transparent border-chimera-matrix/30 text-chimera-primary placeholder:text-chimera-secondary pr-12 font-inter"
              />
              {inputValue && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="w-2 h-2 rounded-full animate-pulse"
                       style={{ backgroundColor: 'var(--chimera-matrix-green)' }}>
                  </div>
                </div>
              )}
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || chatLoading}
              className="floating-card px-8 py-3 bg-chimera-matrix-green/20 border-chimera-matrix-green/40 text-chimera-matrix hover:bg-chimera-matrix-green/30 hover:text-chimera-primary font-inter font-medium relative overflow-hidden transition-all duration-300"
            >
              <span className={chatLoading ? "animate-ai-typing" : ""}>
                {chatLoading ? 'Sending...' : 'Send'}
              </span>
              {!chatLoading && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-chimera-matrix-green/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
