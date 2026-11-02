export const ONBOARDING_KEY = 'kaliyona_onboarding_v1';
export const ONBOARDING_DONE_KEY = 'kaliyona_onboarding_done';

export interface OnboardingData {
  name: string;
  neighborhood?: string;
  level: 'new' | 'basics' | 'conversations';
  learningStyle?: 'voice' | 'flashcards' | 'roleplay' | 'mixed';
  goal: 'order_food' | 'autos_buses' | 'friends' | 'work' | 'travel' | '';
  minutes: '5' | '10' | '15';
  location: string;
  completedAt: string;
}

export function getOnboarding(): OnboardingData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ONBOARDING_KEY);
    return raw ? (JSON.parse(raw) as OnboardingData) : null;
  } catch {
    return null;
  }
}

export function hasOnboarded(): boolean {
  if (typeof window === 'undefined') return true; // never block SSR
  return localStorage.getItem(ONBOARDING_DONE_KEY) === 'true';
}

export function completeOnboarding(data: OnboardingData): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(data));
    localStorage.setItem(ONBOARDING_DONE_KEY, 'true');
  } catch {}
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('kaliyona:onboarding'));
}

export function resetOnboarding(): void {
  try {
    localStorage.removeItem(ONBOARDING_KEY);
    localStorage.removeItem(ONBOARDING_DONE_KEY);
  } catch {}
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('kaliyona:onboarding'));
}
