'use client';

import AuthPage from '@/components/AuthPage';
import UserProfile from '@/components/UserProfile';
import { useAuth } from '@/contexts/AuthContext';

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return user ? <UserProfile user={user} /> : <AuthPage />;
}
