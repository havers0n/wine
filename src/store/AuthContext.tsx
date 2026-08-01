import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from '../services/supabase/client';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isConfigured: boolean;
  message: string | null;
  error: string | null;
  sendMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const supabase = getSupabaseClient();
    let isActive = true;

    void (async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (!isActive) return;
      if (sessionError) {
        setError(sessionError.message);
        setIsLoading(false);
        return;
      }
      if (!sessionData.session) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const { data, error: authError } = await supabase.auth.getUser();
      if (!isActive) return;
      if (authError) setError(authError.message);
      setUser(data.user ?? null);
      setIsLoading(false);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isActive) return;
      setUser(session?.user ?? null);
      setIsLoading(false);
      if (session?.user) {
        setMessage(null);
        setError(null);
      }
    });

    return () => {
      isActive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isLoading,
    isConfigured: isSupabaseConfigured,
    message,
    error,
    sendMagicLink: async (email: string) => {
      setError(null);
      setMessage(null);
      const { error: signInError } = await getSupabaseClient().auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin,
          shouldCreateUser: false,
        },
      });
      if (signInError) {
        setError(signInError.message);
        throw signInError;
      }
      setMessage('קישור כניסה נשלח למייל. אפשר לסגור הודעה זו לאחר פתיחת הקישור.');
    },
    signOut: async () => {
      setError(null);
      const { error: signOutError } = await getSupabaseClient().auth.signOut();
      if (signOutError) {
        setError(signOutError.message);
        throw signOutError;
      }
      setUser(null);
    },
  }), [error, isLoading, message, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
