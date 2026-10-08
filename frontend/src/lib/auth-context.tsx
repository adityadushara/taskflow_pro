'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';
import { apiClient } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isInitializedRef = useRef(false);

  const fetchUserProfile = async () => {
    try {
      const response = await apiClient<UserProfile>('/me');
      if (response.success && response.data) {
        setProfile(response.data);
      }
    } catch (err) {
      console.error('Failed to synchronize user profile:', err);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Check active session on initial mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile().finally(() => {
          if (mounted) {
            isInitializedRef.current = true;
            setIsLoading(false);
          }
        });
      } else {
        isInitializedRef.current = true;
        setIsLoading(false);
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setUser(null);
        setSession(null);
        setIsLoading(false);
        return;
      }

      // Preserve object identity if user ID and token haven't changed
      const nextUser = newSession?.user ?? null;
      setUser((prev) => (prev?.id === nextUser?.id ? prev : nextUser));
      setSession((prev) => (prev?.access_token === newSession?.access_token ? prev : newSession));

      if (event === 'SIGNED_IN') {
        // Only run fetch on first initialization, NOT on window focus or token refresh!
        if (!isInitializedRef.current) {
          setIsLoading(true);
          await fetchUserProfile();
          if (mounted) {
            isInitializedRef.current = true;
            setIsLoading(false);
          }
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      return { error: error ? new Error(error.message) : null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Failed to initiate Google sign in') };
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsLoading(false);
    window.location.href = '/login';
  };

  const refreshProfile = async () => {
    if (session?.user) {
      await fetchUserProfile();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
