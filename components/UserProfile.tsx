'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

interface UserProfileProps {
  user: User;
}

export default function UserProfile({ user }: UserProfileProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleEnterChat = () => {
    router.push('/chat');
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Signed out successfully",
        description: "You have been logged out.",
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error signing out",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetOnboarding = () => {
    localStorage.removeItem('onboarding_completed');
    localStorage.removeItem('onboarding_skipped');
    toast({
      title: "Onboarding reset",
      description: "You'll see the onboarding flow next time you enter chat.",
    });
  };

  const isOnboardingCompleted = localStorage.getItem('onboarding_completed') === 'true';
  const isOnboardingSkipped = localStorage.getItem('onboarding_skipped') === 'true';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome Back!</CardTitle>
          <p className="text-gray-600">Ready to start chatting?</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl font-bold text-blue-600">
                {user.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <h3 className="font-medium text-gray-900">{user.email}</h3>
            <p className="text-sm text-gray-500">
              Member since {new Date(user.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleEnterChat}
              className="w-full"
              size="lg"
            >
              Enter Chat
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={handleResetOnboarding}
                variant="outline"
                size="sm"
                disabled={!isOnboardingCompleted && !isOnboardingSkipped}
              >
                Reset Tutorial
              </Button>
              <Button 
                onClick={handleSignOut}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                {loading ? 'Signing out...' : 'Sign Out'}
              </Button>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              {isOnboardingCompleted 
                ? "Tutorial completed ✓" 
                : isOnboardingSkipped 
                ? "Tutorial skipped" 
                : "Tutorial pending"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
