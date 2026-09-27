'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface SessionTimeoutProviderProps {
  children: React.ReactNode;
  timeoutMinutes?: number; // default 8 hours (480 minutes)
}

export function SessionTimeoutProvider({
  children,
  timeoutMinutes = 480,
}: SessionTimeoutProviderProps) {
  const router = useRouter();
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Events to monitor user activity
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    const interval = setInterval(async () => {
      const inactiveDuration = Date.now() - lastActivityRef.current;
      if (inactiveDuration >= timeoutMs) {
        clearInterval(interval);
        try {
          const supabase = createClient();
          await supabase.auth.signOut();
        } catch (e) {
          // ignore error on timeout
        }
        router.push('/login?reason=session_expired');
      }
    }, 60000); // Check every minute

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
      clearInterval(interval);
    };
  }, [router, timeoutMs]);

  return <>{children}</>;
}
