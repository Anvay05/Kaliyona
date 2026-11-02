/**
 * MODULE 3 — MOUTH (anna-mouth.ts)
 * Upgraded Browser TTS Engine with:
 * 1. Safari-safe Kannada ("kn") Voice Discovery (retries every 250ms up to 6 times + voiceschanged listener)
 * 2. Smart Kannada Voice Ranking:
 *    - Priority a) name contains "Gagan", "Male", or "Natural"
 *    - Priority b) name contains "Enhanced" or "Premium" (Apple enhanced)
 *    - Priority c) any kn voice
 *    - Priority d) if no kn voice at all: mute gracefully, never crash
 * 3. Pitch & Rate Tuning:
 *    - Male (Gagan/Male in name): pitch = 1.0, rate = 0.95
 *    - Female or unknown: pitch = 0.85, rate = 0.95 (never below 0.8)
 *    - Per-character presets (Anna/Suno/Sango) with Anna's base pitch
 * 4. Voice Lab state & device-local override persistence
 * 5. Safari ~200-char sentence-boundary chunking & race-free continuous playback
 */

export type CharacterVoiceId = 'anna' | 'suno' | 'sango';

export interface SpeakAnnaCallbacks {
  onStart?: () => void;
  onBoundary?: () => void;
  onEnd?: () => void;
}

export interface SpeakAnnaInput {
  kanglish?: string;
  script?: string;
  english?: string;
  text?: string;
}

export interface SpeakScriptOptions {
  itemId?: string;
  slow?: boolean;
  character?: CharacterVoiceId;
  onStart?: () => void;
  onBoundary?: () => void;
  onEnd?: () => void;
  onUnsupported?: () => void;
}

export type AnnaPersonalityPresetId =
  | 'friendly_neighbor'
  | 'stern_teacher'
  | 'casual_friend'
  | 'patient_auto_anna';

export interface AnnaPersonalityPreset {
  id: AnnaPersonalityPresetId;
  title: string;
  tag: string;
  description: string;
  pitchDelta: number;
  rateMultiplier: number;
  rhythmPauseMs: number;
  rhythmLabel: string;
  sampleKanglish: string;
  sampleScript: string;
}

export const ANNA_PERSONALITY_PRESETS: Record<
  AnnaPersonalityPresetId,
  AnnaPersonalityPreset
> = {
  friendly_neighbor: {
    id: 'friendly_neighbor',
    title: 'Friendly Neighbor',
    tag: 'WARM · BALANCED',
    description:
      'Welcoming Indiranagar neighbor with natural warmth and steady conversational rhythm.',
    pitchDelta: 0.0,
    rateMultiplier: 1.0,
    rhythmPauseMs: 45,
    rhythmLabel: 'Steady conversational flow',
    sampleKanglish: 'Namaskara guru! Hegiddira? Banni kaapi kudiyona!',
    sampleScript: 'ನಮಸ್ಕಾರ ಗುರು! ಹೇಗಿದ್ದೀರ? ಬನ್ನಿ ಕಾಫಿ ಕುಡಿಯೋಣ!',
  },
  stern_teacher: {
    id: 'stern_teacher',
    title: 'Stern Teacher',
    tag: 'CRISP · DELIBERATE',
    description:
      'Authoritative Kannada master with deeper pitch and measured, syllable-clear pauses.',
    pitchDelta: -0.05,
    rateMultiplier: 0.85,
    rhythmPauseMs: 165,
    rhythmLabel: 'Deliberate clause pauses',
    sampleKanglish: 'Gamanisi! Kannada spasta-vaagi matanadi, tappu maadabedi.',
    sampleScript: 'ಗಮನಿಸಿ! ಕನ್ನಡ ಸ್ಪಷ್ಟವಾಗಿ ಮಾತನಾಡಿ, ತಪ್ಪು ಮಾಡಬೇಡಿ.',
  },
  casual_friend: {
    id: 'casual_friend',
    title: 'Casual Friend',
    tag: 'UPBEAT · LIVELY',
    description:
      'Energetic Koramangala bestie with brighter inflection and brisk street-style cadence.',
    pitchDelta: 0.1,
    rateMultiplier: 1.09,
    rhythmPauseMs: 20,
    rhythmLabel: 'Brisk upbeat cadence',
    sampleKanglish: 'Ayyo macha! Sakkath aagide, bega baa hogona!',
    sampleScript: 'ಅಯ್ಯೋ ಮಚ್ಚಾ! ಸಕ್ಕತ್ ಆಗಿದೆ, ಬೇಗ ಬಾ ಹೋಗೋಣ!',
  },
  patient_auto_anna: {
    id: 'patient_auto_anna',
    title: 'Patient Auto Anna',
    tag: 'CALM · STREETWISE',
    description:
      'Relaxed Bengaluru auto-rickshaw veteran with grounded tone and unhurried pacing.',
    pitchDelta: -0.03,
    rateMultiplier: 0.92,
    rhythmPauseMs: 105,
    rhythmLabel: 'Relaxed street rhythm',
    sampleKanglish: 'Sari saar, meter haakthini. Aaramagi koothkoli!',
    sampleScript: 'ಸರಿ ಸರ್, ಮೀಟರ್ ಹಾಕ್ತೀನಿ. ಆರಾಮಾಗಿ ಕೂತ್ಕೊಳ್ಳಿ!',
  },
};

export interface VoiceLabSnapshot {
  autoVoice: SpeechSynthesisVoice | null;
  activeVoice: SpeechSynthesisVoice | null;
  overrideVoiceName: string | null;
  knVoices: SpeechSynthesisVoice[];
  discoveryDone: boolean;
  personalityPresetId: AnnaPersonalityPresetId;
  personalityPreset: AnnaPersonalityPreset;
  effectivePitch: number;
  effectiveRate: number;
}

export const VOICE_LAB_SAMPLE_LINE =
  'Namaskara! Hegiddira? Kaliyona ge swagata!';
export const VOICE_LAB_SAMPLE_SCRIPT =
  'ನಮಸ್ಕಾರ! ಹೇಗಿದ್ದೀರ? ಕಲಿಯೋಣ ಗೆ ಸ್ವಾಗತ!';

const KANNADA_SCRIPT_REGEX = /[\u0C80-\u0CFF]/;
const SAFARI_MAX_CHUNK_CHARS = 200;

interface CharacterVoicePreset {
  pitchOffset: number;
  rateMultiplier: number;
}

export const CHARACTER_VOICE_PRESETS: Record<
  CharacterVoiceId,
  CharacterVoicePreset
> = {
  anna: { pitchOffset: 0, rateMultiplier: 1.0 },
  suno: { pitchOffset: 0.05, rateMultiplier: 1.0 },
  sango: { pitchOffset: 0.1, rateMultiplier: 1.03 },
};

let cachedAutoVoice: SpeechSynthesisVoice | null = null;
let cachedFallbackIndianVoice: SpeechSynthesisVoice | null = null;
let cachedKnVoices: SpeechSynthesisVoice[] = [];
let discoveryComplete = false;
let hasLoggedVoiceSelection = false;
let voiceDiscoveryPromise: Promise<SpeechSynthesisVoice | null> | null = null;

// Prevent browser GC of active utterance mid-speech and guard against stale cancel/end races
let activeUtteranceRef: SpeechSynthesisUtterance | null = null;
let currentSpeechGeneration = 0;

export function getAnnaPersonalityPreset(): AnnaPersonalityPreset {
  return ANNA_PERSONALITY_PRESETS.friendly_neighbor;
}

function isKannadaVoice(v: SpeechSynthesisVoice): boolean {
  const normLang = (v.lang || '').toLowerCase().replace('_', '-');
  return normLang.startsWith('kn');
}

function getKannadaVoicePriorityScore(v: SpeechSynthesisVoice): number {
  const name = v.name || '';
  // Priority a) name contains "Gagan", "Male", or "Natural"
  if (/gagan|\bmale\b|natural/i.test(name)) {
    return 3;
  }
  // Priority b) name contains "Enhanced" or "Premium" (Apple enhanced)
  if (/enhanced|premium/i.test(name)) {
    return 2;
  }
  // Priority c) any kn voice
  return 1;
}

/**
 * Builds the ranked Kannada (lang starts with "kn") voice list:
 * Priority a) name contains "Gagan", "Male", or "Natural"
 * Priority b) name contains "Enhanced" or "Premium" (Apple enhanced)
 * Priority c) any kn voice
 */
export function rankKannadaVoices(
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice[] {
  if (!voices || voices.length === 0) return [];

  const knList = voices.filter(isKannadaVoice);
  return knList
    .map((voice, index) => ({
      voice,
      score: getKannadaVoicePriorityScore(voice),
      index,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.index - b.index;
    })
    .map((entry) => entry.voice);
}

function pickIndianFallbackVoice(
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;
  const norm = (v: SpeechSynthesisVoice) =>
    (v.lang || '').toLowerCase().replace('_', '-');

  return (
    voices.find((v) => norm(v).startsWith('hi')) ||
    voices.find((v) => norm(v).startsWith('en-in')) ||
    voices.find(
      (v) =>
        norm(v).includes('-in') ||
        (v.name || '').toLowerCase().includes('india')
    ) ||
    null
  );
}

export function isMaleKannadaVoice(
  voice: SpeechSynthesisVoice | null | undefined
): boolean {
  if (!voice) return false;
  return /gagan|\bmale\b/i.test(voice.name || '');
}

/**
 * Computes pitch, rate, and rhythm pause for the active voice, character, and Anna personality preset.
 * - Male (Gagan/Male in name): base pitch = 1.0, base rate = 0.95
 * - Female or unknown: base pitch = 0.85, base rate = 0.95
 * - Applies Anna personality preset pitchDelta & rateMultiplier when character === 'anna'
 * - NEVER goes below 0.8 pitch.
 */
export function getVoicePitchAndRate(
  voice: SpeechSynthesisVoice | null | undefined,
  options?: { slow?: boolean; character?: CharacterVoiceId }
): { pitch: number; rate: number; rhythmPauseMs: number } {
  const basePitch = isMaleKannadaVoice(voice) ? 1.0 : 0.85;
  const baseRate = options?.slow ? 0.72 : 0.95;

  const characterKey: CharacterVoiceId = options?.character || 'anna';
  const charPreset =
    CHARACTER_VOICE_PRESETS[characterKey] || CHARACTER_VOICE_PRESETS.anna;
  const personality = getAnnaPersonalityPreset();

  const personalityPitchDelta =
    characterKey === 'anna' ? personality.pitchDelta : 0;
  const personalityRateMult =
    characterKey === 'anna' && !options?.slow ? personality.rateMultiplier : 1.0;

  const tunedPitch = Math.max(
    0.8,
    Math.min(
      2.0,
      Math.round(
        (basePitch + charPreset.pitchOffset + personalityPitchDelta) * 100
      ) / 100
    )
  );
  const tunedRate =
    Math.round(
      baseRate * charPreset.rateMultiplier * personalityRateMult * 100
    ) / 100;

  return {
    pitch: tunedPitch,
    rate: tunedRate,
    rhythmPauseMs: characterKey === 'anna' ? personality.rhythmPauseMs : 40,
  };
}

function getActiveVoiceFromCache(): SpeechSynthesisVoice | null {
  return cachedAutoVoice;
}

function updateCachedVoicesFromSynth(synth: SpeechSynthesis): boolean {
  let allVoices: SpeechSynthesisVoice[] = [];
  try {
    allVoices = synth.getVoices() || [];
  } catch {
    allVoices = [];
  }

  const rankedKn = rankKannadaVoices(allVoices);
  cachedKnVoices = rankedKn;
  cachedAutoVoice = rankedKn[0] || null;
  cachedFallbackIndianVoice = pickIndianFallbackVoice(allVoices);

  if (allVoices.length > 0) {
    discoveryComplete = true;
  }

  return rankedKn.length > 0 || allVoices.length > 0;
}

/**
 * Safari-safe voice discovery:
 * Calls speechSynthesis.getVoices(). If empty, retries every 150ms up to 4 times
 * AND listens for voiceschanged. Resolves immediately once getVoices() is non-empty.
 */
export async function getOrResolveAnnaVoice(
  synth?: SpeechSynthesis
): Promise<SpeechSynthesisVoice | null> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    discoveryComplete = true;
    return null;
  }

  const targetSynth = synth || window.speechSynthesis;

  if (discoveryComplete) {
    return getActiveVoiceFromCache();
  }

  if (updateCachedVoicesFromSynth(targetSynth)) {
    discoveryComplete = true;
    return getActiveVoiceFromCache();
  }

  if (voiceDiscoveryPromise) {
    return voiceDiscoveryPromise;
  }

  voiceDiscoveryPromise = new Promise<SpeechSynthesisVoice | null>((resolve) => {
    let settled = false;
    let retries = 0;
    const maxRetries = 4;
    const retryIntervalMs = 150;

    const cleanupAndFinish = () => {
      if (settled) return;
      settled = true;
      window.clearInterval(intervalId);
      try {
        targetSynth.removeEventListener?.('voiceschanged', onVoicesChanged);
      } catch {
        // Ignore removeEventListener issues
      }

      updateCachedVoicesFromSynth(targetSynth);
      discoveryComplete = true;
      hasLoggedVoiceSelection = true;

      voiceDiscoveryPromise = null;
      resolve(getActiveVoiceFromCache());
    };

    const onVoicesChanged = () => {
      if (updateCachedVoicesFromSynth(targetSynth)) {
        cleanupAndFinish();
      }
    };

    try {
      targetSynth.addEventListener?.('voiceschanged', onVoicesChanged);
    } catch {
      // Ignore if addEventListener is unsupported on speechSynthesis
    }

    const intervalId = window.setInterval(() => {
      retries += 1;
      if (updateCachedVoicesFromSynth(targetSynth) || retries >= maxRetries) {
        cleanupAndFinish();
      }
    }, retryIntervalMs);
  });

  return voiceDiscoveryPromise;
}

// Initialize voice discovery on app init in browser environments
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  try {
    void getOrResolveAnnaVoice(window.speechSynthesis);
    window.speechSynthesis.addEventListener?.('voiceschanged', () => {
      updateCachedVoicesFromSynth(window.speechSynthesis);
    });
  } catch {
    // Ignore pre-warm errors
  }
}

/**
 * Strips emojis, smooths mid-sentence dashes into continuous clauses, and chunks
 * long text at ~200 chars on sentence boundaries so Safari never cuts off mid-speech
 * while keeping normal 1-2 sentence replies in a single continuous utterance.
 */
export function chunkTextForSafari(
  text: string,
  maxChars = SAFARI_MAX_CHUNK_CHARS
): string[] {
  const withoutEmojis = (text || '')
    .replace(
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu,
      ''
    )
    // Smooth em-dashes and ellipses into natural continuous speech flow
    .replace(/\s*[—–]+\s*/g, ', ')
    .replace(/\.{2,}|…/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!withoutEmojis) return [];

  if (withoutEmojis.length <= maxChars) {
    return [withoutEmojis];
  }

  const rawSentences = withoutEmojis
    .split(/(?<=[.!?|॥])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const sentences = rawSentences.length > 0 ? rawSentences : [withoutEmojis];
  const chunks: string[] = [];
  let current = '';

  const pushLongSentenceByWords = (longSentence: string) => {
    const words = longSentence.split(/\s+/).filter(Boolean);
    let buffer = '';
    for (const word of words) {
      const candidate = buffer ? `${buffer} ${word}` : word;
      if (candidate.length <= maxChars) {
        buffer = candidate;
      } else {
        if (buffer) chunks.push(buffer);
        buffer = word.length <= maxChars ? word : word.slice(0, maxChars);
      }
    }
    if (buffer) chunks.push(buffer);
  };

  for (const sentence of sentences) {
    if (sentence.length > maxChars) {
      if (current) {
        chunks.push(current);
        current = '';
      }
      pushLongSentenceByWords(sentence);
      continue;
    }

    const combined = current ? `${current} ${sentence}` : sentence;
    if (combined.length <= maxChars) {
      current = combined;
    } else {
      if (current) chunks.push(current);
      current = sentence;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

export function stopAnnaMouth(): void {
  currentSpeechGeneration += 1;
  activeUtteranceRef = null;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }
  } catch {
    // Ignore cancel errors
  }
}

/**
 * Shared TTS playback pipeline:
 * resolved text -> picked voice (override > auto) -> pitch/rate rules -> speechSynthesis.speak()
 * - Cancels any queued utterance before speaking a new one (with generation guard so stale onEnd never fires).
 * - Chunks long text at ~200 chars on sentence boundaries for Safari while keeping normal replies in one continuous utterance.
 * - If no kn voice is available at all (Priority d), mutes gracefully without crashing while maintaining smooth animation timing.
 */
export async function speakScript(
  kannadaScriptText: string,
  options: SpeakScriptOptions = {}
): Promise<boolean> {
  const {
    itemId,
    slow,
    character = 'anna',
    onStart,
    onBoundary,
    onEnd,
    onUnsupported,
  } = options;

  const cleaned = (kannadaScriptText || '').trim();
  if (!cleaned || !KANNADA_SCRIPT_REGEX.test(cleaned)) {
    console.warn(
      `[speakScript] Missing Kannada script for item "${
        itemId || 'unknown'
      }" (received: "${kannadaScriptText || ''}"). Refusing to speak romanized text.`
    );
    onEnd?.();
    return false;
  }

  if (
    typeof window === 'undefined' ||
    !('speechSynthesis' in window) ||
    typeof SpeechSynthesisUtterance === 'undefined'
  ) {
    onUnsupported?.();
    onEnd?.();
    return false;
  }

  const myGeneration = ++currentSpeechGeneration;

  try {
    const synth = window.speechSynthesis;

    // Cancel any queued/active utterance before starting a new one
    if (synth.speaking || synth.pending) {
      try {
        synth.cancel();
      } catch {
        // Ignore cancel errors
      }
      // Wait 45ms so Chrome/Safari async cancel() doesn't immediately abort the new utterance
      await new Promise<void>((r) => window.setTimeout(r, 45));
      if (myGeneration !== currentSpeechGeneration) {
        return false;
      }
    }

    const chosenVoice = await getOrResolveAnnaVoice(synth);
    if (myGeneration !== currentSpeechGeneration) {
      return false;
    }

    const chunks = chunkTextForSafari(cleaned, SAFARI_MAX_CHUNK_CHARS);
    if (chunks.length === 0) {
      if (myGeneration === currentSpeechGeneration) {
        onEnd?.();
      }
      return false;
    }

    const playbackVoice = chosenVoice || cachedFallbackIndianVoice;
    const { pitch, rate, rhythmPauseMs } = getVoicePitchAndRate(
      playbackVoice,
      {
        slow,
        character,
      }
    );

    // If the active personality has deliberate clause pauses (>= 100ms, e.g. Stern Teacher / Patient Auto Anna),
    // split multi-sentence text on sentence boundaries so rhythmPauseMs is audible between sentences
    const rhythmChunks =
      character === 'anna' && rhythmPauseMs >= 100 && chunks.length === 1
        ? chunks[0]
            .split(/(?<=[.!?|॥])\s+/)
            .map((s) => s.trim())
            .filter(Boolean)
        : chunks;

    const effectiveChunks = rhythmChunks.length > 0 ? rhythmChunks : chunks;

    // Estimate natural speaking duration (~75ms per char, clamped 1200ms..3200ms)
    // in case no kn voice exists (graceful mute) or the browser finishes instantaneously
    const minNaturalDurationMs = Math.min(
      3200,
      Math.max(1200, cleaned.length * 65)
    );
    const speechStartTimestamp = Date.now();

    onStart?.();

    // Priority d) If no kn/Indian voice at all: mute gracefully, keep smooth animation duration, never crash
    if (!playbackVoice) {
      await new Promise<void>((r) =>
        window.setTimeout(r, minNaturalDurationMs)
      );
      return false;
    }

    for (let idx = 0; idx < effectiveChunks.length; idx++) {
      const chunk = effectiveChunks[idx];
      if (myGeneration !== currentSpeechGeneration) {
        return false;
      }

      await new Promise<void>((resolve) => {
        try {
          const utterance = new SpeechSynthesisUtterance(chunk);
          activeUtteranceRef = utterance;
          utterance.voice = playbackVoice;
          utterance.lang = playbackVoice.lang || 'kn-IN';
          utterance.rate = rate;
          utterance.pitch = pitch;

          let done = false;
          const finishChunk = () => {
            if (done) return;
            done = true;
            window.clearTimeout(safetyTimeout);
            if (activeUtteranceRef === utterance) {
              activeUtteranceRef = null;
            }
            resolve();
          };

          const safetyTimeout = window.setTimeout(finishChunk, 8000);

          utterance.onboundary = () => {
            if (myGeneration === currentSpeechGeneration) {
              onBoundary?.();
            }
          };

          utterance.onend = finishChunk;
          utterance.onerror = finishChunk;

          synth.speak(utterance);
        } catch {
          resolve();
        }
      });

      // Apply personality rhythm pause between clauses/sentences
      if (
        idx < effectiveChunks.length - 1 &&
        rhythmPauseMs > 30 &&
        myGeneration === currentSpeechGeneration
      ) {
        await new Promise<void>((r) => window.setTimeout(r, rhythmPauseMs));
      }
    }

    // If the browser speech engine resolved abnormally fast (< 250ms), pad the remaining
    // animation window so the character never blinks for a single frame
    const elapsedMs = Date.now() - speechStartTimestamp;
    if (elapsedMs < 250 && myGeneration === currentSpeechGeneration) {
      await new Promise<void>((r) =>
        window.setTimeout(r, Math.max(0, minNaturalDurationMs - elapsedMs))
      );
    }

    return Boolean(chosenVoice);
  } catch {
    return false;
  } finally {
    if (myGeneration === currentSpeechGeneration) {
      onEnd?.();
    }
  }
}

/**
 * Strips [MOOD:...] tags, emojis, markdown formatting, quotes rendering artifacts, and extraneous punctuation
 * so the TTS engine reads clean, natural text aloud without verbalizing syntax or symbols.
 */
export function cleanTextForSpeech(raw: string): string {
  if (!raw) return '';
  return (
    raw
      // Strip trailing or inline [MOOD:...] tags
      .replace(/\[MOOD:\s*[a-zA-Z_]+\s*\]/gi, '')
      // Strip parenthetical native Kannada script if already paired with romanized text so non-kn voices don't stumble
      .replace(/\(\s*[\u0C80-\u0CFF\s!?.,]+\s*\)/g, '')
      // Replace '=' in word-by-word breakdowns ('kodi' = give) with a natural comma pause so TTS never says "equals"
      .replace(/\s*=\s*/g, ', ')
      // Strip emojis (standard Unicode emoji ranges, pictographs, symbols)
      .replace(
        /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}]/gu,
        ''
      )
      // Strip markdown bold, italics, strikethrough, inline code
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/~~([^~]+)~~/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      // Strip markdown headers, blockquotes, bullets
      .replace(/^[#>\-*•]+\s+/gm, '')
      // Strip single/double quotes wrapping phrases while preserving contractions like It's / Don't
      .replace(/(^|[\s(—\-,.:;!?])['‘’]([^'‘’\n]+)['‘’](?=[\s)—\-,.:;!?]|$)/g, '$1$2')
      .replace(/["“”„‟«»`]/g, '')
      .replace(/[‘’]/g, "'")
      // Normalize multi-dashes to a clean natural pause dash
      .replace(/--+/g, ' — ')
      // Normalize newlines and whitespace
      .replace(/\s+/g, ' ')
      .trim()
  );
}

export interface TwoPartSpeechSegments {
  line1Translit: string;
  line1Script: string;
  line2Explanation: string;
  explanationLang: 'en' | 'hi' | 'kn';
}

function detectExplanationSpeechLang(text: string): 'en' | 'hi' | 'kn' {
  if (!text) return 'en';
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  if (
    /\b(dekho|matlab|bolo|bhai|kaise|karo|hona|karni|karte|karna|zyada|thoda|kripya|aap|tum|samjho|lagao|seedha|mein|aur|dijiye|sab|jaate|hai|hain|utha|haath|wala|wale)\b/i.test(
      text
    )
  ) {
    return 'hi';
  }
  return 'en';
}

/**
 * Splits a two-part reply into:
 * - Line 1 (Kannada phrase transliteration + native Kannada script)
 * - Line 2 onwards (Explanation in the user's language)
 */
export function parseTwoPartSpeechSegments(
  input: string | SpeakAnnaInput | any
): TwoPartSpeechSegments {
  if (!input) {
    return {
      line1Translit: '',
      line1Script: '',
      line2Explanation: '',
      explanationLang: 'en',
    };
  }

  const rawMain =
    typeof input === 'string'
      ? input
      : (input.text || input.kanglish || '').trim();
  const explicitScript =
    typeof input === 'object' && typeof input.script === 'string'
      ? input.script.trim()
      : '';
  const explicitEnglish =
    typeof input === 'object' && typeof input.english === 'string'
      ? input.english.trim()
      : '';

  const strippedMood = rawMain.replace(/\[MOOD:\s*[a-zA-Z_]+\s*\]/gi, '').trim();
  const lines = strippedMood
    .split(/\r?\n/)
    .map((l: string) => l.trim())
    .filter(Boolean);

  const rawLine1 = lines[0] || '';
  const rawLine2 =
    lines.length >= 2 ? lines.slice(1).join(' ') : explicitEnglish;

  // Extract native Kannada script from brackets on Line 1 if present
  const bracketScriptMatch = rawLine1.match(/\(\s*([\u0C80-\u0CFF][^)]*)\)/);
  const inlineScriptMatch = rawLine1.match(/[\u0C80-\u0CFF]+(?:\s+[\u0C80-\u0CFF!?.,]+)*/);
  const line1Script = (
    (bracketScriptMatch && bracketScriptMatch[1]) ||
    explicitScript ||
    (inlineScriptMatch && inlineScriptMatch[0]) ||
    ''
  ).trim();

  const line1Translit = cleanTextForSpeech(rawLine1);
  const line2Explanation = cleanTextForSpeech(rawLine2);
  const explanationLang =
    (typeof input === 'object' && input.explanation_lang) ||
    detectExplanationSpeechLang(rawLine2 || line2Explanation);

  return {
    line1Translit,
    line1Script,
    line2Explanation,
    explanationLang,
  };
}

/**
 * Builds ONE unified preview string when needed by legacy helpers
 */
export function buildSingleAnnaSpokenText(
  input: string | SpeakAnnaInput | any
): string {
  const { line1Translit, line2Explanation } = parseTwoPartSpeechSegments(input);
  if (!line2Explanation) return line1Translit;
  if (!line1Translit) return line2Explanation;
  const pause = /[.!?]$/.test(line1Translit) ? '' : '.';
  return `${line1Translit}${pause} — ${line2Explanation}`;
}

let cachedSingleAnnaVoice: SpeechSynthesisVoice | null = null;

export function getCachedSingleAnnaVoice(): SpeechSynthesisVoice | null {
  return cachedSingleAnnaVoice;
}

export function resolveSingleAnnaVoice(
  allVoices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  if (cachedSingleAnnaVoice) return cachedSingleAnnaVoice;
  if (!allVoices || allVoices.length === 0) return null;

  const norm = (v: SpeechSynthesisVoice) =>
    (v.lang || '').toLowerCase().replace('_', '-');

  const knVoices = allVoices.filter((v) => norm(v).startsWith('kn'));
  const rankedKn = rankKannadaVoices(knVoices);
  if (rankedKn.length > 0) {
    cachedSingleAnnaVoice = rankedKn[0];
    return cachedSingleAnnaVoice;
  }

  const enInVoice =
    allVoices.find((v) => norm(v) === 'en-in') ||
    allVoices.find((v) => norm(v).startsWith('en-in')) ||
    allVoices.find((v) => norm(v).includes('-in') && norm(v).startsWith('en')) ||
    allVoices.find(
      (v) =>
        (v.name || '').toLowerCase().includes('india') && norm(v).startsWith('en')
    ) ||
    allVoices.find((v) => norm(v).startsWith('hi')) ||
    allVoices.find((v) => norm(v).startsWith('en')) ||
    allVoices[0] ||
    null;

  cachedSingleAnnaVoice = enInVoice;
  return cachedSingleAnnaVoice;
}

function resolveExplanationVoice(
  allVoices: SpeechSynthesisVoice[],
  lang: 'en' | 'hi' | 'kn'
): SpeechSynthesisVoice | null {
  if (!allVoices || allVoices.length === 0) return null;
  const norm = (v: SpeechSynthesisVoice) =>
    (v.lang || '').toLowerCase().replace('_', '-');

  if (lang === 'kn') {
    const knVoices = rankKannadaVoices(
      allVoices.filter((v) => norm(v).startsWith('kn'))
    );
    if (knVoices.length > 0) return knVoices[0];
  }

  if (lang === 'hi') {
    const hiVoice =
      allVoices.find((v) => norm(v) === 'hi-in') ||
      allVoices.find((v) => norm(v).startsWith('hi')) ||
      null;
    if (hiVoice) return hiVoice;
  }

  return (
    allVoices.find((v) => norm(v) === 'en-in') ||
    allVoices.find((v) => norm(v).startsWith('en-in')) ||
    allVoices.find((v) => norm(v).includes('-in') && norm(v).startsWith('en')) ||
    allVoices.find((v) => norm(v).startsWith('en')) ||
    allVoices[0] ||
    null
  );
}

export async function getOrResolveSingleAnnaVoice(
  synth?: SpeechSynthesis
): Promise<SpeechSynthesisVoice | null> {
  if (cachedSingleAnnaVoice) {
    return cachedSingleAnnaVoice;
  }
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null;
  }

  const targetSynth = synth || window.speechSynthesis;
  const initialVoices = targetSynth.getVoices() || [];
  if (initialVoices.length > 0) {
    return resolveSingleAnnaVoice(initialVoices);
  }

  await new Promise<void>((resolve) => {
    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      try {
        targetSynth.removeEventListener('voiceschanged', finish);
      } catch {
        // Ignore
      }
      resolve();
    };

    try {
      targetSynth.addEventListener('voiceschanged', finish);
    } catch {
      // Ignore
    }

    let count = 0;
    const interval = window.setInterval(() => {
      count++;
      const v = targetSynth.getVoices();
      if ((v && v.length > 0) || count >= 6) {
        window.clearInterval(interval);
        finish();
      }
    }, 100);
  });

  return resolveSingleAnnaVoice(targetSynth.getVoices() || []);
}

async function speakSingleUtterance(
  synth: SpeechSynthesis,
  text: string,
  voice: SpeechSynthesisVoice | null,
  fallbackLang: string,
  myGeneration: number,
  onBoundary?: () => void
): Promise<void> {
  if (!text || myGeneration !== currentSpeechGeneration) return;

  const utterance = new SpeechSynthesisUtterance(text);
  activeUtteranceRef = utterance;

  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang || fallbackLang;
  } else {
    utterance.lang = fallbackLang;
  }

  utterance.pitch = isMaleKannadaVoice(voice) ? 1.0 : 0.95;
  utterance.rate = 0.95;

  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.clearTimeout(safetyTimeout);
      if (activeUtteranceRef === utterance) {
        activeUtteranceRef = null;
      }
      resolve();
    };

    const timeoutMs = Math.max(8000, text.length * 85);
    const safetyTimeout = window.setTimeout(finish, timeoutMs);

    utterance.onboundary = () => {
      if (myGeneration === currentSpeechGeneration) {
        onBoundary?.();
      }
    };

    utterance.onend = finish;
    utterance.onerror = finish;

    try {
      synth.speak(utterance);
    } catch (err) {
      console.warn('[Anna Voice] synth.speak error:', err);
      finish();
    }
  });
}

/**
 * Two-Part Anna Speech:
 * - Line 1 (Kannada line): spoken in the Kannada voice (kn-IN if available, reading native Kannada script or transliteration).
 * - Line 2 onwards (Explanation): spoken in the explanation voice matching the user's language (hi-IN / en-IN / kn-IN).
 */
export async function speakAnnaReply(
  input: string | SpeakAnnaInput | any,
  callbacks: SpeakAnnaCallbacks = {}
): Promise<void> {
  const { onStart, onBoundary, onEnd } = callbacks;

  const {
    line1Translit,
    line1Script,
    line2Explanation,
    explanationLang,
  } = parseTwoPartSpeechSegments(input);

  if (!line1Translit && !line1Script && !line2Explanation) {
    onEnd?.();
    return;
  }

  if (
    typeof window === 'undefined' ||
    !('speechSynthesis' in window) ||
    typeof SpeechSynthesisUtterance === 'undefined'
  ) {
    const totalLen = (line1Translit + line2Explanation).length;
    const durationMs = Math.min(4500, Math.max(1400, totalLen * 55));
    onStart?.();
    await new Promise<void>((r) => window.setTimeout(r, durationMs));
    onEnd?.();
    return;
  }

  const synth = window.speechSynthesis;
  const myGeneration = ++currentSpeechGeneration;

  // Cancel any queued/active utterance before starting new one
  if (synth.speaking || synth.pending) {
    try {
      synth.cancel();
    } catch {
      // Ignore cancel errors
    }
    await new Promise<void>((r) => window.setTimeout(r, 45));
    if (myGeneration !== currentSpeechGeneration) return;
  }

  await getOrResolveSingleAnnaVoice(synth);
  if (myGeneration !== currentSpeechGeneration) return;

  const allVoices = synth.getVoices() || [];
  const norm = (v: SpeechSynthesisVoice) =>
    (v.lang || '').toLowerCase().replace('_', '-');

  const rankedKnVoices = rankKannadaVoices(
    allVoices.filter((v) => norm(v).startsWith('kn'))
  );
  const kannadaVoice =
    rankedKnVoices[0] || resolveExplanationVoice(allVoices, 'en');
  const hasNativeKnVoice = rankedKnVoices.length > 0;

  // If a real kn-IN voice is installed and Line 1 has Kannada script, speak the Kannada script for authentic pronunciation;
  // otherwise speak the clean Kannada transliteration.
  const line1SpokenText =
    hasNativeKnVoice && line1Script ? line1Script : line1Translit || line1Script;

  const explanationVoice = resolveExplanationVoice(allVoices, explanationLang);

  onStart?.();

  if (line1SpokenText) {
    console.log(
      `[Anna Voice] Line 1 (Kannada): "${line1SpokenText}" | Voice: ${
        kannadaVoice?.name || 'Default'
      } (${kannadaVoice?.lang || 'kn-IN'})`
    );
    await speakSingleUtterance(
      synth,
      line1SpokenText,
      kannadaVoice,
      hasNativeKnVoice ? 'kn-IN' : 'en-IN',
      myGeneration,
      onBoundary
    );
  }

  if (line2Explanation && myGeneration === currentSpeechGeneration) {
    const expFallbackLang =
      explanationLang === 'hi'
        ? 'hi-IN'
        : explanationLang === 'kn'
        ? 'kn-IN'
        : 'en-IN';
    console.log(
      `[Anna Voice] Line 2 (Explanation [${explanationLang}]): "${line2Explanation}" | Voice: ${
        explanationVoice?.name || 'Default'
      } (${explanationVoice?.lang || expFallbackLang})`
    );
    await speakSingleUtterance(
      synth,
      line2Explanation,
      explanationVoice,
      expFallbackLang,
      myGeneration,
      onBoundary
    );
  }

  if (myGeneration === currentSpeechGeneration) {
    onEnd?.();
  }
}
