'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Volume2, Clipboard, Clock, Cpu, User, Send, X, Plus, Grid3X3 } from 'lucide-react';
import { CommandMenu } from '@/components/ui/command-menu';
import { ClipboardManager } from '@/components/ui/clipboard-manager';
import { ThinkingAnimation } from '@/components/chat/thinking-animation';
import UserProfile from '@/components/UserProfile';
import AuthPage from '@/components/AuthPage';
import { useAuth } from '@/contexts/AuthContext';

export default function Page() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [activeTool, setActiveTool] = useState('');
  const { user } = useAuth();

  return user ? <UserProfile user={user} /> : <AuthPage />;
}
