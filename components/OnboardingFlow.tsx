'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PersonaSelector from '@/components/PersonaSelector';
import { usePersonas } from '@/hooks/usePersonas';

interface OnboardingFlowProps {
  onComplete: (personaId: string) => void;
  onSkip: () => void;
}

export default function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPersonaId, setSelectedPersonaId] = useState('helpful-assistant');
  const { personas, loading } = usePersonas();

  const steps = [
    {
      title: "Welcome to AI Chat!",
      content: (
        <div className="text-center space-y-4">
          <div className="text-6xl mb-4">🤖</div>
          <p className="text-gray-600">
            Get ready to chat with AI personas that have unique personalities and expertise.
          </p>
          <p className="text-sm text-gray-500">
            This quick setup will help you get started.
          </p>
        </div>
      )
    },
    {
      title: "Choose Your AI Persona",
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 text-center mb-6">
            Select an AI persona to start with. You can always change this later or create custom ones.
          </p>
          {loading ? (
            <div className="flex justify-center">
              <div className="spinner"></div>
            </div>
          ) : (
            <PersonaSelector
              personas={personas}
              selectedPersonaId={selectedPersonaId}
              onPersonaSelect={setSelectedPersonaId}
              customPersona=""
              onCustomPersonaChange={() => {}}
              showCustom={false}
              compact={true}
            />
          )}
        </div>
      )
    },
    {
      title: "You're All Set!",
      content: (
        <div className="text-center space-y-4">
          <div className="text-6xl mb-4">🎉</div>
          <p className="text-gray-600">
            Perfect! You're ready to start chatting with your AI persona.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Pro tip:</strong> You can create custom personas, switch between different AI personalities, and even generate new ones based on your needs.
            </p>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('onboarding_completed', 'true');
    onComplete(selectedPersonaId);
  };

  const handleSkip = () => {
    localStorage.setItem('onboarding_skipped', 'true');
    onSkip();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 onboarding-overlay">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="text-center">
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm text-gray-500">
              Step {currentStep + 1} of {steps.length}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSkip}
              className="text-gray-500 hover:text-gray-700"
            >
              Skip Tutorial
            </Button>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className="bg-blue-600 h-2 rounded-full progress-bar" 
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {steps[currentStep].title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="onboarding-step">
            {steps[currentStep].content}
          </div>
          
          <div className="flex justify-between mt-8">
            <Button 
              variant="outline" 
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              Back
            </Button>
            <Button onClick={handleNext}>
              {currentStep === steps.length - 1 ? 'Start Chatting!' : 'Next'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
