/**
 * Single swappable configuration for the isolated "Talk to Anna" voice stack
 * and voice-powered semantic speak-exercise scoring.
 */

export interface VoiceConfigSchema {
  GEMINI_API_KEY: string;
  TRANSCRIBE_MODEL: string;
  BRAIN_MODEL: string;
  MOCK_MODE: boolean;
  MAX_TURNS_PER_SESSION: number;
  MAX_RECORD_SECONDS: number;
  DAILY_MINUTES_CAP: number;
}

export const VOICE_CONFIG: VoiceConfigSchema = {
  GEMINI_API_KEY: 'PASTE_KEY_HERE', // hackathon only — key is visible in browser; rotate after the event (server proxy automatically uses process.env.GEMINI_API_KEY)
  TRANSCRIBE_MODEL: 'gemini-3.5-transcribe',
  BRAIN_MODEL: 'gemini-3.5-flash-lite', // low-latency text responses
  MOCK_MODE: false, // true = no API calls, fake transcripts + canned replies, so UI can be built/tested free
  MAX_TURNS_PER_SESSION: 12, // cost guard
  MAX_RECORD_SECONDS: 15, // push-to-talk auto-release cap
  DAILY_MINUTES_CAP: 20, // localStorage-tracked soft cap
};

const DAILY_USAGE_STORAGE_KEY = 'kanglish_anna_daily_voice_usage_v1';

interface DailyVoiceUsageRecord {
  date: string; // YYYY-MM-DD
  secondsUsed: number;
}

function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(now.getDate()).padStart(2, '0')}`;
}

export function getDailyVoiceSecondsUsed(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(DAILY_USAGE_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as DailyVoiceUsageRecord;
    if (parsed.date !== getTodayDateString()) {
      return 0;
    }
    return Math.max(0, Number(parsed.secondsUsed) || 0);
  } catch {
    return 0;
  }
}

export function addDailyVoiceSeconds(seconds: number): number {
  if (typeof window === 'undefined' || seconds <= 0) {
    return getDailyVoiceSecondsUsed();
  }
  const current = getDailyVoiceSecondsUsed();
  const updated = current + Math.round(seconds);
  try {
    const record: DailyVoiceUsageRecord = {
      date: getTodayDateString(),
      secondsUsed: updated,
    };
    localStorage.setItem(DAILY_USAGE_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Ignore storage errors
  }
  return updated;
}

export function isDailyMinutesCapReached(): boolean {
  const usedMinutes = getDailyVoiceSecondsUsed() / 60;
  return usedMinutes >= VOICE_CONFIG.DAILY_MINUTES_CAP;
}

export function getRemainingDailyMinutes(): number {
  const usedMinutes = getDailyVoiceSecondsUsed() / 60;
  return Math.max(
    0,
    Math.round((VOICE_CONFIG.DAILY_MINUTES_CAP - usedMinutes) * 10) / 10
  );
}

export function setVoiceMockMode(enabled: boolean): void {
  VOICE_CONFIG.MOCK_MODE = Boolean(enabled);
}
