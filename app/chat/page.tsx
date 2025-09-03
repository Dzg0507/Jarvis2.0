'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import OnboardingFlow from '@/components/OnboardingFlow';
import MessageBubble from '@/components/MessageBubble';
import TypingIndicator from '@/components/TypingIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePersonas } from '@/hooks/usePersonas';
import { useChat } from '@/hooks/useChat';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Settings } from 'lucide-react';

export default function ChatPage() {
  const { user, loading, signOut } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { toast } = useToast();

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Enhanced Matrix Background Effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-black opacity-90 z-10"></div>
        <div className="grid-overlay absolute inset-0 z-5 opacity-30"></div>
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
        <div className="terminal border-b border-animated p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-glow-cyan font-orbitron float-animation">J.A.R.V.I.S</h1>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-matrix-green rounded-full pulse-dot shadow-lg shadow-matrix-green/50"></div>
                <span className="text-sm text-glow-purple font-orbitron">{getPersonaName()}</span>
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
            </div>
          </div>
        </div>



        {/* Enhanced Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 backdrop-blur-sm">
          {messages.length === 0 ? (
            <div className="text-center text-matrix-green mt-8">
              <div className="text-4xl mb-4 text-glow-blue float-animation">💬</div>
              <p className="font-orbitron text-glow-cyan">Start a conversation with {getPersonaName()}!</p>
              <p className="text-sm mt-2 text-glow-orange">Type a message below to begin.</p>
              <div className="mt-6 flex justify-center space-x-4">
                {['Hello!', 'How are you?', 'Tell me a joke'].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setInputValue(suggestion)}
                    className="px-3 py-1 text-xs border border-matrix-green/30 rounded text-matrix-green hover:bg-matrix-green/10 transition-all duration-300 hover:scale-105"
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
        <div className="terminal border-t border-animated p-4 backdrop-blur-sm">
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${getPersonaName()}...`}
                disabled={chatLoading}
                className="terminal-input pr-12"
              />
              {inputValue && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="w-2 h-2 bg-matrix-green rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || chatLoading}
              className="btn-matrix px-6 relative overflow-hidden"
            >
              <span className={chatLoading ? "matrix-loading" : "color-shift"}>
                {chatLoading ? 'Sending...' : 'Send'}
              </span>
              {!chatLoading && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-matrix-green/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
