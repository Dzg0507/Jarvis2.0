'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PersonaSelector from '@/components/PersonaSelector';
import { MatrixRain } from '@/components/chat/matrix-rain';
import { Particles } from '@/components/ui/particles';
import { usePersonas } from '@/hooks/usePersonas';
import { ArrowLeft, Settings, User, Palette, Zap } from 'lucide-react';

export default function SettingsPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const { personas, selectedPersonaId, setSelectedPersonaId, customPersona, setCustomPersona } = usePersonas();
  const [isBooted, setIsBooted] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      return;
    }
    
    // Boot animation
    const timer = setTimeout(() => setIsBooted(true), 500);
    return () => clearTimeout(timer);
  }, [user, loading, router]);

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
          <div className="matrix-loading text-2xl font-orbitron mb-4">LOADING SETTINGS</div>
          <div className="w-8 h-8 border-2 border-matrix-green border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background Effects */}
      <MatrixRain />
      <Particles className="absolute inset-0 -z-10" quantity={150} />
      <div className="absolute inset-0 grid-overlay z-0 opacity-20" />
      
      {/* Animated Scanlines */}
      <div className="absolute inset-0 z-5 pointer-events-none">
        <div className="scanlines"></div>
      </div>

      <div 
        className="relative z-20 min-h-screen transition-all duration-1000"
        style={{ opacity: isBooted ? 1 : 0, transform: isBooted ? 'translateY(0)' : 'translateY(20px)' }}
      >
        {/* Header */}
        <div className="terminal border-b border-matrix-green p-6">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => router.push('/chat')}
                className="btn-matrix p-2"
                size="sm"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center space-x-3">
                <Settings className="w-6 h-6 text-glow-cyan animate-pulse" />
                <h1 className="text-2xl font-orbitron text-glow-cyan">SYSTEM CONFIGURATION</h1>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-sm text-matrix-green font-mono">
                USER: {user?.email}
              </div>
              <Button 
                onClick={handleSignOut}
                className="btn-matrix"
                size="sm"
              >
                LOGOUT
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto p-6">
          <Tabs defaultValue="personas" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 bg-black/50 border border-matrix-green/30">
              <TabsTrigger 
                value="personas" 
                className="data-[state=active]:bg-matrix-green/20 data-[state=active]:text-glow-green font-orbitron"
              >
                <User className="w-4 h-4 mr-2" />
                PERSONAS
              </TabsTrigger>
              <TabsTrigger 
                value="appearance" 
                className="data-[state=active]:bg-matrix-green/20 data-[state=active]:text-glow-green font-orbitron"
              >
                <Palette className="w-4 h-4 mr-2" />
                APPEARANCE
              </TabsTrigger>
              <TabsTrigger 
                value="performance" 
                className="data-[state=active]:bg-matrix-green/20 data-[state=active]:text-glow-green font-orbitron"
              >
                <Zap className="w-4 h-4 mr-2" />
                PERFORMANCE
              </TabsTrigger>
              <TabsTrigger 
                value="advanced" 
                className="data-[state=active]:bg-matrix-green/20 data-[state=active]:text-glow-green font-orbitron"
              >
                <Settings className="w-4 h-4 mr-2" />
                ADVANCED
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personas" className="space-y-6">
              <Card className="glass border-neon-green">
                <CardHeader>
                  <CardTitle className="text-glow-green font-orbitron flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    AI PERSONA MANAGEMENT
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PersonaSelector
                    personas={personas}
                    selectedPersonaId={selectedPersonaId}
                    onPersonaSelect={setSelectedPersonaId}
                    customPersona={customPersona}
                    onCustomPersonaChange={setCustomPersona}
                    showCustom={true}
                    compact={false}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-6">
              <Card className="glass border-neon-cyan">
                <CardHeader>
                  <CardTitle className="text-glow-cyan font-orbitron">VISUAL CONFIGURATION</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-matrix-green font-mono">
                    <p>• Matrix Rain Intensity: MAXIMUM</p>
                    <p>• Particle Effects: ENABLED</p>
                    <p>• Glow Effects: ENHANCED</p>
                    <p>• Animation Speed: OPTIMAL</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              <Card className="glass border-neon-green">
                <CardHeader>
                  <CardTitle className="text-glow-green font-orbitron">SYSTEM PERFORMANCE</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-matrix-green font-mono">
                    <p>• AI Response Time: OPTIMIZED</p>
                    <p>• Memory Usage: EFFICIENT</p>
                    <p>• Network Status: CONNECTED</p>
                    <p>• Cache Status: ACTIVE</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6">
              <Card className="glass border-neon-cyan">
                <CardHeader>
                  <CardTitle className="text-glow-cyan font-orbitron">ADVANCED SETTINGS</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-matrix-green font-mono">
                    <p>• Debug Mode: DISABLED</p>
                    <p>• Logging Level: STANDARD</p>
                    <p>• API Endpoints: CONFIGURED</p>
                    <p>• Security Level: MAXIMUM</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
