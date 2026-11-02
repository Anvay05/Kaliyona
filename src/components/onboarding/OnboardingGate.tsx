'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { hasOnboarded } from '@/lib/onboarding';
import { OnboardingFlow } from './OnboardingFlow';

export function OnboardingGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(true);

  useEffect(() => {
    const sync = () => setDone(hasOnboarded());
    sync();
    setReady(true);
    window.addEventListener('kaliyona:onboarding', sync);
    return () => window.removeEventListener('kaliyona:onboarding', sync);
  }, []);

  if (!ready) return null; // avoid hydration flash
  if (!done) return <OnboardingFlow onDone={() => setDone(true)} />;
  return <>{children}</>;
}
