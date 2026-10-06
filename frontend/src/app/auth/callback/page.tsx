'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

function CallbackContent() {
  const router = useRouter();
  const [statusMessage, setStatusMessage] = useState('Completing authentication...');

  useEffect(() => {
    let isMounted = true;

    const processAuth = async () => {
      // 1. Check for explicit error query parameters from provider
      const searchParams = new URLSearchParams(window.location.search);
      const error = searchParams.get('error');
      const errorDesc = searchParams.get('error_description');

      if (error) {
        console.error('OAuth error from provider:', error, errorDesc);
        router.push(`/login?error=${encodeURIComponent(errorDesc || error)}`);
        return;
      }

      // 2. Check for PKCE authorization code
      const code = searchParams.get('code');
      if (code) {
        setStatusMessage('Exchanging authorization code...');
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error('PKCE exchange error:', exchangeError);
          router.push(`/login?error=${encodeURIComponent(exchangeError.message)}`);
          return;
        }
      }

      // 3. For implicit flow (#access_token=...), Supabase automatically parses hash
      // Check current session
      const { data: { session } } = await supabase.auth.getSession();
      if (session && isMounted) {
        router.replace('/dashboard');
        return;
      }

      // 4. Subscribe to auth change event in case hash exchange is still resolving
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && newSession && isMounted) {
          router.replace('/dashboard');
        }
      });

      // Safety timeout fallback
      const timer = setTimeout(async () => {
        if (!isMounted) return;
        const { data: { session: finalSession } } = await supabase.auth.getSession();
        if (finalSession) {
          router.replace('/dashboard');
        } else {
          router.push('/login?error=authentication_failed');
        }
      }, 2500);

      return () => {
        isMounted = false;
        subscription.unsubscribe();
        clearTimeout(timer);
      };
    };

    processAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col items-center text-center max-w-sm w-full">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
        <h2 className="text-base font-semibold text-slate-800">Signing in...</h2>
        <p className="mt-1 text-xs text-slate-500">{statusMessage}</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
