/**
 * MODULE 2 — BRAIN (anna-brain.ts)
 * Two core functions + Level 1.5 Canned Fallback:
 *   A) chat(userTranscript, history) -> Anna Kanglish persona JSON reply
 *   B) scoreSpeakAttempt(targetKn, userTranscript) -> semantic speak-exercise scorer
 *   C) getCannedAnnaReply(userTranscript) -> keyword-matched fallback
 */

import { GoogleGenAI } from '@google/genai';
import { VOICE_CONFIG } from './voiceConfig';
import {
  scoreSpeechAttempt as legacyStringScore,
  getKannadaScriptForText,
} from '../utils/speechUtils';
import { SCENARIOS } from '../data/scenarios';
import { replyTo as replyToPersona, buildDynamicEnglishReply } from '../lib/anna-persona-engine';
import {
  resolveEffectiveApiKey,
  sendAnnaChatCompletion,
  ANNA_SYSTEM_PROMPT,
  parseAnnaModelResponse,
  DEMO_KEY_LIMIT_MESSAGE,
  getAiConfig,
  isZeroKeyFallback,
} from '../lib/aiConfig';

export type AnnaMood = 'happy' | 'neutral' | 'excited' | 'thinking';

export interface AnnaBrainReply {
  kanglish: string;
  script?: string;
  english: string;
  reply: string; // backwards compatibility
  correction: string | null;
  mood: AnnaMood;
  explanation_lang?: 'en' | 'hi' | 'kn';
  source?: 'gemini' | 'canned';
  offlineReason?: string;
}

export interface AnnaChatTurn {
  id?: string;
  role: 'user' | 'anna';
  text: string;
  kanglish?: string;
  script?: string;
  english?: string;
  correction?: string | null;
  mood?: AnnaMood;
  explanation_lang?: 'en' | 'hi' | 'kn';
  source?: 'gemini' | 'canned';
  offlineReason?: string;
  favourite?: boolean;
  edited?: boolean;
}

export interface SemanticSpeakScoreResult {
  match: boolean;
  unverified: boolean;
  feedback: string;
  closenessPct: number;
  source: 'gemini' | 'unverified';
}

export const ANNA_UNVERIFIED_MESSAGE = 'Swalpa aamele try maadi guru!';

export { ANNA_SYSTEM_PROMPT };

const VALID_MOODS = new Set<AnnaMood>([
  'happy',
  'neutral',
  'excited',
  'thinking',
]);

// Anti-repetition tracker: never repeat the same canned variant twice in a row per category or session
const lastCannedCategoryIndices = new Map<string, number>();
let lastSessionCannedKanglish = '';
let currentCannedOfflineReason = 'offline: fallback';

function pickCannedVariant(
  categoryKey: string,
  variants: Array<{
    kanglish: string;
    script?: string;
    english: string;
    reply: string;
    correction: string | null;
    mood: AnnaMood;
  }>,
  offlineReason?: string
): AnnaBrainReply {
  const lastIdx = lastCannedCategoryIndices.get(categoryKey);
  let availableIndices = variants
    .map((_, i) => i)
    .filter((i) => variants.length <= 1 || i !== lastIdx);

  // Cross-category session anti-repetition guard: avoid matching previous canned utterance
  const nonDuplicateIndices = availableIndices.filter(
    (i) => variants[i].kanglish !== lastSessionCannedKanglish
  );
  if (nonDuplicateIndices.length > 0) {
    availableIndices = nonDuplicateIndices;
  }

  const pickedIdx =
    availableIndices[Math.floor(Math.random() * availableIndices.length)];
  lastCannedCategoryIndices.set(categoryKey, pickedIdx);
  const picked = variants[pickedIdx];
  lastSessionCannedKanglish = picked.kanglish;

  return {
    ...picked,
    source: 'canned',
    offlineReason: offlineReason || currentCannedOfflineReason,
  };
}

/**
 * C) CANNED FALLBACK (used when brain call fails or VOICE_CONFIG.MOCK_MODE is true)
 * All canned replies are bilingual (kanglish + english + script) with 3+ variants per intent.
 */
export function getCannedAnnaReply(
  userTranscript: string,
  offlineReason = 'offline: fallback',
  persona?: AnnaPersonaContext | null
): AnnaBrainReply {
  currentCannedOfflineReason = offlineReason;
  const lower = (userTranscript || '').trim().toLowerCase();

  // If a roleplay persona is active, use the deterministic roleplay persona engine first!
  if (persona && persona.id && persona.id !== 'anna') {
    const matchedCard =
      SCENARIOS.find((c) => c.id === persona.id) || null;
    if (matchedCard) {
      const personaReply = replyToPersona(matchedCard, userTranscript, []);
      return {
        kanglish: personaReply.kanglish,
        script: personaReply.script,
        english: personaReply.english,
        reply: personaReply.kanglish,
        correction: null,
        mood: personaReply.mood || 'happy',
        source: 'canned',
        offlineReason,
      };
    }
  }


  // 1. Beginner mix-up: neeru vs neera
  if (/\bneeru\s+hogu\b/.test(lower)) {
    return pickCannedVariant('lookalike_neera', [
      {
        kanglish: 'Sari guru, neera hogthini! Hold tight!',
        script: 'ಸರಿ ಗುರು, ನೇರಾ ಹೋಗ್ತೀನಿ! Hold tight!',
        english: 'Alright, going straight! Hold tight!',
        reply: 'Sari guru, neera hogthini! Hold tight!',
        correction: 'Use "neera hogu" for go straight ("neeru" means water).',
        mood: 'happy',
      },
      {
        kanglish: 'Neera hogona guru! Meter on ide!',
        script: 'ನೇರಾ ಹೋಗೋಣ ಗುರು! ಮೀಟರ್ ಆನ್ ಇದೆ!',
        english: "Let's go straight! Meter is running!",
        reply: 'Neera hogona guru! Meter on ide!',
        correction: 'Say "neera" (straight), remember "neeru" is water!',
        mood: 'happy',
      },
      {
        kanglish: 'Straight aagi neera hogthini guru!',
        script: 'ಸ್ಟ್ರೈಟ್ ಆಗಿ ನೇರಾ ಹೋಗ್ತೀನಿ ಗುರು!',
        english: 'Going straight ahead friend!',
        reply: 'Straight aagi neera hogthini guru!',
        correction: 'Remember: "neera" = straight, "neeru" = water.',
        mood: 'excited',
      },
    ]);
  }

  // 2. Beginner mix-up: illi nillu vs illi nillisi
  if (/\billi\s+nillu\b/.test(lower)) {
    return pickCannedVariant('lookalike_nillisi', [
      {
        kanglish: 'Illi nillisthini sir! Auto side haakthini.',
        script: 'ಇಲ್ಲಿ ನಿಲ್ಲಿಸ್ತೀನಿ ಸರ್! ಆಟೋ ಸೈಡ್ ಹಾಕ್ತೀನಿ.',
        english: 'Stopping right here sir! Pulling the auto to the curb.',
        reply: 'Illi nillisthini sir! Auto side haakthini.',
        correction:
          'To an auto driver, say "illi nillisi" ("nillu" is for a person on foot).',
        mood: 'happy',
      },
      {
        kanglish: 'Sari sir, curb hatra nillisthini!',
        script: 'ಸರಿ ಸರ್, ಕರ್ಬ್ ಹತ್ರ ನಿಲ್ಲಿಸ್ತೀನಿ!',
        english: 'Alright sir, stopping near the curb!',
        reply: 'Sari sir, curb hatra nillisthini!',
        correction: 'Say "nillisi" politely to vehicle drivers.',
        mood: 'happy',
      },
      {
        kanglish: 'One minute sir, illae nillisthini!',
        script: 'ಒಂದು ಮಿನಿಟ್ ಸರ್, ಇಲ್ಲೇ ನಿಲ್ಲಿಸ್ತೀನಿ!',
        english: 'One minute sir, stopping right here!',
        reply: 'One minute sir, illae nillisthini!',
        correction: 'Use "nillisi" for vehicles, "nillu" for pedestrians.',
        mood: 'happy',
      },
    ]);
  }

  // 3. Small talk: "who are you" / identity
  if (
    /\b(who\s+(are\s+you|r\s+u|you\s+are)|who\s+you|yaar\s+neevu|neevu\s+yaaru)\b/.test(
      lower
    )
  ) {
    return pickCannedVariant('who_are_you', [
      {
        kanglish:
          '"Naanu Anna, nimma Kannada tutor" (ನಾನು ಅಣ್ಣ, ನಿಮ್ಮ ಕನ್ನಡ ಟ್ಯೂಟರ್)',
        script: 'ನಾನು ಅಣ್ಣ, ನಿಮ್ಮ ಕನ್ನಡ ಟ್ಯೂಟರ್',
        english:
          'Means "I am Anna, your Kannada tutor" — \'naanu\' = I, \'nimma\' = your. I am your Kannada tutor in the Kaliyona app!',
        reply:
          '"Naanu Anna, nimma Kannada tutor" (ನಾನು ಅಣ್ಣ, ನಿಮ್ಮ ಕನ್ನಡ ಟ್ಯೂಟರ್)',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish:
          '"Naanu Kaliyona Kannada shikshaki" (ನಾನು ಕಲಿಯೋಣ ಕನ್ನಡ ಶಿಕ್ಷಕಿ)',
        script: 'ನಾನು ಕಲಿಯೋಣ ಕನ್ನಡ ಶಿಕ್ಷಕಿ',
        english:
          'Means "I am the Kaliyona Kannada teacher" — \'naanu\' = I, \'shikshaki\' = teacher. Ask me anything you want to learn in Kannada!',
        reply:
          '"Naanu Kaliyona Kannada shikshaki" (ನಾನು ಕಲಿಯೋಣ ಕನ್ನಡ ಶಿಕ್ಷಕಿ)',
        correction: null,
        mood: 'excited',
      },
      {
        kanglish:
          '"Naanu nimma Kannada guru Anna" (ನಾನು ನಿಮ್ಮ ಕನ್ನಡ ಗುರು ಅಣ್ಣ)',
        script: 'ನಾನು ನಿಮ್ಮ ಕನ್ನಡ ಗುರು ಅಣ್ಣ',
        english:
          'Means "I am your Kannada teacher Anna" — \'naanu\' = I, \'nimma\' = your, \'guru\' = teacher/guide in the Kaliyona app.',
        reply:
          '"Naanu nimma Kannada guru Anna" (ನಾನು ನಿಮ್ಮ ಕನ್ನಡ ಗುರು ಅಣ್ಣ)',
        correction: null,
        mood: 'happy',
      },
    ]);
  }

  // 4. Small talk: "how are you"
  if (
    /\b(how\s+are\s+you|how\s+r\s+u|how\s+you\s+doing|hegiddira|hegidya)\b/.test(
      lower
    )
  ) {
    return pickCannedVariant('how_are_you', [
      {
        kanglish: '"Naanu chennagidini! Neevu hegiddira?" (ನಾನು ಚೆನ್ನಾಗಿದ್ದೀನಿ! ನೀವು ಹೇಗಿದ್ದೀರಾ?)',
        script: 'ನಾನು ಚೆನ್ನಾಗಿದ್ದೀನಿ! ನೀವು ಹೇಗಿದ್ದೀರಾ?',
        english:
          'Means "I am fine! How are you?" — \'chennagidini\' = I am fine, \'hegiddira\' = how are you.',
        reply: '"Naanu chennagidini! Neevu hegiddira?" (ನಾನು ಚೆನ್ನಾಗಿದ್ದೀನಿ! ನೀವು ಹೇಗಿದ್ದೀರಾ?)',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish: '"Tumba chennagidini!" (ತುಂಬಾ ಚೆನ್ನಾಗಿದ್ದೀನಿ!)',
        script: 'ತುಂಬಾ ಚೆನ್ನಾಗಿದ್ದೀನಿ!',
        english:
          'Means "I am doing very well!" — \'tumba\' = very, \'chennagidini\' = doing well.',
        reply: '"Tumba chennagidini!" (ತುಂಬಾ ಚೆನ್ನಾಗಿದ್ದೀನಿ!)',
        correction: null,
        mood: 'excited',
      },
    ]);
  }

  // 5. Small talk: "what's your name"
  if (
    /\b(what(?:'s|\s+is)\s+your\s+name|your\s+name|nimma\s+hesaru|ninna\s+hesaru)\b/.test(
      lower
    )
  ) {
    return pickCannedVariant('name', [
      {
        kanglish: '"Nanna hesaru Anna" (ನನ್ನ ಹೆಸರು ಅಣ್ಣ)',
        script: 'ನನ್ನ ಹೆಸರು ಅಣ್ಣ',
        english:
          'Means "My name is Anna" — \'nanna\' = my, \'hesaru\' = name. I am your Kannada tutor in the Kaliyona app!',
        reply: '"Nanna hesaru Anna" (ನನ್ನ ಹೆಸರು ಅಣ್ಣ)',
        correction: null,
        mood: 'happy',
      },
    ]);
  }

  // 6. Small talk: "thank you" / "thanks"
  if (
    /\b(thanks|thank\s+you|thanku|dhanyavada|parvagilla)\b|ಧನ್ಯವಾದ/.test(lower)
  ) {
    return pickCannedVariant('thanks', [
      {
        kanglish: '"Parvagilla! Kushi aagi kaliyiri" (ಪರವಾಗಿಲ್ಲ! ಖುಷಿ ಆಗಿ ಕಲಿಯಿರಿ)',
        script: 'ಪರವಾಗಿಲ್ಲ! ಖುಷಿ ಆಗಿ ಕಲಿಯಿರಿ',
        english:
          'Means "No problem! Learn happily" — \'parvagilla\' = no problem/welcome, \'kaliyiri\' = learn.',
        reply: '"Parvagilla! Kushi aagi kaliyiri" (ಪರವಾಗಿಲ್ಲ! ಖುಷಿ ಆಗಿ ಕಲಿಯಿರಿ)',
        correction: null,
        mood: 'happy',
      },
    ]);
  }

  // 7. Small talk: "bye" / goodbye
  if (
    /\b(bye|goodbye|see\s+you|hogbittu|bartini|sigona|shubha)\b/.test(lower)
  ) {
    return pickCannedVariant('bye', [
      {
        kanglish: '"Hogi bartini!" (ಹೋಗಿ ಬರ್ತೀನಿ!)',
        script: 'ಹೋಗಿ ಬರ್ತೀನಿ!',
        english:
          'Means "I will go and come back" (standard Kannada goodbye) — \'hogi\' = go, \'bartini\' = I will come.',
        reply: '"Hogi bartini!" (ಹೋಗಿ ಬರ್ತೀನಿ!)',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish: '"Matte sigona!" (ಮತ್ತೆ ಸಿಗೋಣ!)',
        script: 'ಮತ್ತೆ ಸಿಗೋಣ!',
        english:
          'Means "Let us meet again!" — \'matte\' = again, \'sigona\' = let us meet.',
        reply: '"Matte sigona!" (ಮತ್ತೆ ಸಿಗೋಣ!)',
        correction: null,
        mood: 'happy',
      },
    ]);
  }

  // 8. English-only greeting (e.g. "hello", "hi")
  if (
    /^(hello|hi|hey|good\s+(morning|afternoon|evening))\b/i.test(lower) &&
    !/(namaskara|hegiddira|chennagidini)/i.test(lower)
  ) {
    return pickCannedVariant('english_greeting', [
      {
        kanglish: '"Namaskara! Hegiddira?" (ನಮಸ್ಕಾರ! ಹೇಗಿದ್ದೀರಾ?)',
        script: 'ನಮಸ್ಕಾರ! ಹೇಗಿದ್ದೀರಾ?',
        english:
          'Means "Hello! How are you?" — \'namaskara\' = hello, \'hegiddira\' = how are you. Try greeting anyone in Bengaluru with this!',
        reply: '"Namaskara! Hegiddira?" (ನಮಸ್ಕಾರ! ಹೇಗಿದ್ದೀರಾ?)',
        correction: null,
        mood: 'happy',
      },
    ]);
  }

  // 9. Kanglish greetings ("namaskara", "namaste")
  if (/\b(namaskara|namaste)\b|ನಮಸ್ಕಾರ/.test(lower)) {
    return pickCannedVariant('kanglish_greeting', [
      {
        kanglish: '"Namaskara! Hegiddira?" (ನಮಸ್ಕಾರ! ಹೇಗಿದ್ದೀರಾ?)',
        script: 'ನಮಸ್ಕಾರ! ಹೇಗಿದ್ದೀರಾ?',
        english:
          'Means "Hello! How are you?" — \'namaskara\' = hello, \'hegiddira\' = how are you.',
        reply: '"Namaskara! Hegiddira?" (ನಮಸ್ಕಾರ! ಹೇಗಿದ್ದೀರಾ?)',
        correction: null,
        mood: 'happy',
      },
    ]);
  }

  // 10. Weather / bisi / male
  if (
    /\b(weather|bisi|male|rain|hot|sunny|thanna|cool)\b|ಬಿಸಿ|ಮಳೆ/.test(lower)
  ) {
    return pickCannedVariant('weather', [
      {
        kanglish:
          'Ha guru, ivattu tumba bisi ide! Swalpa thanna neeru kudi.',
        script:
          'ಹಾ ಗುರು, ಇವತ್ತು ತುಂಬಾ ಬಿಸಿ ಇದೆ! ಸ್ವಲ್ಪ ತಣ್ಣ ನೀರು ಕುಡಿ.',
        english:
          'Yes friend, it is very hot today! Drink some cool water.',
        reply:
          'Ha guru, ivattu tumba bisi ide! Swalpa thanna neeru kudi.',
        correction: null,
        mood: 'excited',
      },
      {
        kanglish:
          'Bengaluru weather sudden change aagutte guru! Male barabahudu!',
        script:
          'ಬೆಂಗಳೂರು ವೆದರ್ ಸಡನ್ ಚೇಂಜ್ ಆಗುತ್ತೆ ಗುರು! ಮಳೆ ಬರಬಹುದು!',
        english: 'Bengaluru weather changes quickly! Rain might come!',
        reply:
          'Bengaluru weather sudden change aagutte guru! Male barabahudu!',
        correction: null,
        mood: 'thinking',
      },
      {
        kanglish:
          'Swalpa chill haavamaana ide guru, bisi filter kaapi kudyona!',
        script:
          'ಸ್ವಲ್ಪ ಚಿಲ್ ಹವಾಮಾನ ಇದೆ ಗುರು, ಬಿಸಿ ಫಿಲ್ಟರ್ ಕಾಫಿ ಕುಡಿಯೋಣ!',
        english:
          "The weather is pleasant and cool, let's have some hot filter coffee!",
        reply:
          'Swalpa chill haavamaana ide guru, bisi filter kaapi kudyona!',
        correction: null,
        mood: 'happy',
      },
    ]);
  }

  // 11. Traffic / late / signal
  if (
    /\b(traffic|late|signal|silk\s+board|jam|bega|nidhana)\b|ಟ್ರಾಫಿಕ್/.test(
      lower
    )
  ) {
    return pickCannedVariant('traffic', [
      {
        kanglish:
          'Traffic nodi guru, Bengaluru full busy! Swalpa adjust maadi.',
        script:
          'ಟ್ರಾಫಿಕ್ ನೋಡಿ ಗುರು, ಬೆಂಗಳೂರು ಫುಲ್ ಬ್ಯುಸಿ! ಸ್ವಲ್ಪ ಅಡ್ಜಸ್ಟ್ ಮಾಡಿ.',
        english:
          'Look at the traffic, Bengaluru is packed! Please adjust a bit.',
        reply:
          'Traffic nodi guru, Bengaluru full busy! Swalpa adjust maadi.',
        correction: null,
        mood: 'thinking',
      },
      {
        kanglish:
          'Silk Board signal hatra tumba jam guru! Short-cut hogona.',
        script:
          'ಸಿಲ್ಕ್ ಬೋರ್ಡ್ ಸಿಗ್ನಲ್ ಹತ್ರ ತುಂಬಾ ಜಾಮ್ ಗುರು! ಶಾರ್ಟ್ ಕಟ್ ಹೋಗೋಣ.',
        english: "Huge jam near Silk Board signal! Let's take a short-cut.",
        reply:
          'Silk Board signal hatra tumba jam guru! Short-cut hogona.',
        correction: null,
        mood: 'neutral',
      },
      {
        kanglish:
          'Bengaluru traffic andre patience beku guru! Relax aagi kootkoli.',
        script:
          'ಬೆಂಗಳೂರು ಟ್ರಾಫಿಕ್ ಅಂದ್ರೆ ಪೇಷನ್ಸ್ ಬೇಕು ಗುರು! ರಿಲ್ಯಾಕ್ಸ್ ಆಗಿ ಕೂತ್ಕೊಳ್ಳಿ.',
        english:
          'Bengaluru traffic requires patience! Relax and sit back.',
        reply:
          'Bengaluru traffic andre patience beku guru! Relax aagi kootkoli.',
        correction: null,
        mood: 'happy',
      },
    ]);
  }

  // 12a. Auto extra fare / "auto wala extra maang raha hai"
  if (
    /\b(extra|maang|jasti|jaasti|zyada|overcharge|above\s+meter|on\s+meter)\b/i.test(
      lower
    )
  ) {
    return pickCannedVariant('auto_extra', [
      {
        kanglish:
          '"Metre mele hattu jasti" (ಮೀಟರ್ ಮೇಲೆ ಹತ್ತು ಜಾಸ್ತಿ)',
        script: 'ಮೀಟರ್ ಮೇಲೆ ಹತ್ತು ಜಾಸ್ತಿ',
        english:
          'Means "ten extra on the meter" — \'metre mele\' = on the meter, \'hattu jasti\' = ten extra. Say this directly to the auto driver.',
        reply:
          '"Metre mele hattu jasti" (ಮೀಟರ್ ಮೇಲೆ ಹತ್ತು ಜಾಸ್ತಿ)',
        correction: null,
        mood: 'happy',
      },
    ]);
  }

  // 12b. Meter / fare / auto ride / UPI
  if (
    /\b(meter|metre|fare|eshtu|bartira|majestic|airport|market|office|nillisi|leftu|rightu|neera|upi|scan|chillare)\b|ಮೀಟರ್|ಎಷ್ಟು/.test(
      lower
    )
  ) {
    return pickCannedVariant('ride', [
      {
        kanglish: '"Metre haaki" (ಮೀಟರ್ ಹಾಕಿ)',
        script: 'ಮೀಟರ್ ಹಾಕಿ',
        english:
          'Means "put on the meter" — \'metre\' = meter, \'haaki\' = put on. Say this right when you hop in!',
        reply: '"Metre haaki" (ಮೀಟರ್ ಹಾಕಿ)',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish: '"UPI scan ideya?" (ಯುಪಿಐ ಸ್ಕ್ಯಾನ್ ಇದೆಯಾ?)',
        script: 'ಯುಪಿಐ ಸ್ಕ್ಯಾನ್ ಇದೆಯಾ?',
        english:
          'Means "is UPI scan available?" — \'UPI scan\' = QR scan, \'ideya\' = is there. Easy way to pay!',
        reply: '"UPI scan ideya?" (ಯುಪಿಐ ಸ್ಕ್ಯಾನ್ ಇದೆಯಾ?)',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish: '"Metre mele hattu jasti" (ಮೀಟರ್ ಮೇಲೆ ಹತ್ತು ಜಾಸ್ತಿ)',
        script: 'ಮೀಟರ್ ಮೇಲೆ ಹತ್ತು ಜಾಸ್ತಿ',
        english:
          'Means "ten extra on the meter" — \'metre mele\' = on the meter, \'hattu jasti\' = ten extra.',
        reply: '"Metre mele hattu jasti" (ಮೀಟರ್ ಮೇಲೆ ಹತ್ತು ಜಾಸ್ತಿ)',
        correction: null,
        mood: 'neutral',
      },
    ]);
  }

  // 10. Easy / hard / learn / conversation in Kanglish
  if (
    /\b(easy|hard|difficult|learn|learning|practice|practicing|conversation|sulabha|kashta|kali|kalibodu)\b/i.test(
      lower
    )
  ) {
    return pickCannedVariant('easy_hard_learn', [
      {
        kanglish: '"Kannada kaliyodu tumba sulabha" (ಕನ್ನಡ ಕಲಿಯೋದು ತುಂಬಾ ಸುಲಭ)',
        script: 'ಕನ್ನಡ ಕಲಿಯೋದು ತುಂಬಾ ಸುಲಭ',
        english:
          'Means "Learning Kannada is very easy" — \'kaliyodu\' = learning, \'tumba\' = very, \'sulabha\' = easy.',
        reply: '"Kannada kaliyodu tumba sulabha" (ಕನ್ನಡ ಕಲಿಯೋದು ತುಂಬಾ ಸುಲಭ)',
        correction: null,
        mood: 'happy',
      },
    ], offlineReason);
  }

  // 11. Like / love / Bengaluru
  if (
    /\b(do\s+you\s+like|you\s+like|love|preeti|bengaluru|bangalore)\b/i.test(
      lower
    )
  ) {
    return pickCannedVariant('like_love_bengaluru', [
      {
        kanglish: '"Nanage Bengaluru tumba ishta" (ನನಗೆ ಬೆಂಗಳೂರು ತುಂಬಾ ಇಷ್ಟ)',
        script: 'ನನಗೆ ಬೆಂಗಳೂರು ತುಂಬಾ ಇಷ್ಟ',
        english:
          'Means "I like Bengaluru very much" — \'nanage\' = to me, \'tumba\' = very much, \'ishta\' = like/love.',
        reply: '"Nanage Bengaluru tumba ishta" (ನನಗೆ ಬೆಂಗಳೂರು ತುಂಬಾ ಇಷ್ಟ)',
        correction: null,
        mood: 'happy',
      },
    ], offlineReason);
  }

  // 12. Favourite / favorite
  if (/\b(favourite|favorite|fav|all-time\s+favorite)\b/i.test(lower)) {
    return pickCannedVariant('favourite', [
      {
        kanglish: '"Masala dose mattu kaapi ishta" (ಮಸಾಲ ದೋಸೆ ಮತ್ತು ಕಾಫಿ ಇಷ್ಟ)',
        script: 'ಮಸಾಲ ದೋಸೆ ಮತ್ತು ಕಾಫಿ ಇಷ್ಟ',
        english:
          'Means "I love masala dosa and coffee" — \'mattu\' = and, \'ishta\' = like/favourite.',
        reply: '"Masala dose mattu kaapi ishta" (ಮಸಾಲ ದೋಸೆ ಮತ್ತು ಕಾಫಿ ಇಷ್ಟ)',
        correction: null,
        mood: 'happy',
      },
    ], offlineReason);
  }

  // 13. Where is / locations / directions
  if (
    /\b(where\s+is|where's|where\s+are|elli\s+ide|ellide|how\s+to\s+go\s+to|how\s+to\s+reach|route\s+to)\b/i.test(
      lower
    )
  ) {
    return pickCannedVariant('where_is', [
      {
        kanglish: '"Metro station elli ide?" (ಮೆಟ್ರೋ ಸ್ಟೇಷನ್ ಎಲ್ಲಿ ಇದೆ?)',
        script: 'ಮೆಟ್ರೋ ಸ್ಟೇಷನ್ ಎಲ್ಲಿ ಇದೆ?',
        english:
          'Means "Where is the metro station?" — \'elli\' = where, \'ide\' = is. Replace metro station with any place name!',
        reply: '"Metro station elli ide?" (ಮೆಟ್ರೋ ಸ್ಟೇಷನ್ ಎಲ್ಲಿ ಇದೆ?)',
        correction: null,
        mood: 'happy',
      },
    ], offlineReason);
  }

  // 14. Food / coffee / dosa / oota
  if (
    /\b(oota|dose|dosa|idli|vade|coffee|tea|neeru|beku|kodi|chennagide|olledu|thindi|food|eat|dinner|lunch|breakfast)\b|ಊಟ|ದೋಸೆ|ಕಾಫಿ/i.test(
      lower
    )
  ) {
    return pickCannedVariant('food', [
      {
        kanglish: '"Ondu coffee kodi" (ಒಂದು ಕಾಫಿ ಕೊಡಿ)',
        script: 'ಒಂದು ಕಾಫಿ ಕೊಡಿ',
        english:
          'Means "give me one coffee" — \'ondu\' = one, \'kodi\' = give. Works for anything: ondu tea kodi, ondu dosa kodi.',
        reply: '"Ondu coffee kodi" (ಒಂದು ಕಾಫಿ ಕೊಡಿ)',
        correction: null,
        mood: 'excited',
      },
      {
        kanglish: '"Ondu masala dose kodi" (ಒಂದು ಮಸಾಲ ದೋಸೆ ಕೊಡಿ)',
        script: 'ಒಂದು ಮಸಾಲ ದೋಸೆ ಕೊಡಿ',
        english:
          'Means "give me one masala dosa" — \'ondu\' = one, \'masala dose\' = masala dosa, \'kodi\' = give.',
        reply: '"Ondu masala dose kodi" (ಒಂದು ಮಸಾಲ ದೋಸೆ ಕೊಡಿ)',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish: '"Oota aayta?" (ಊಟ ಆಯ್ತಾ?)',
        script: 'ಊಟ ಆಯ್ತಾ?',
        english:
          'Means "had your meal?" — \'oota\' = meal, \'aayta\' = done. Best way to greet friends in Bengaluru!',
        reply: '"Oota aayta?" (ಊಟ ಆಯ್ತಾ?)',
        correction: null,
        mood: 'excited',
      },
    ], offlineReason);
  }

  // 15. Ticket Conductor / bus ticket questions
  if (
    /\b(ticket|conductor|bus\s+pass|bus\s+stop|bmtc|next\s+stop)\b/i.test(lower)
  ) {
    return pickCannedVariant('conductor_ticket', [
      {
        kanglish: '"Majestic ge ondu ticket kodi" (ಮೆಜೆಸ್ಟಿಕ್ ಗೆ ಒಂದು ಟಿಕೆಟ್ ಕೊಡಿ)',
        script: 'ಮೆಜೆಸ್ಟಿಕ್ ಗೆ ಒಂದು ಟಿಕೆಟ್ ಕೊಡಿ',
        english:
          'Means "give one ticket to Majestic" — \'Majestic ge\' = to Majestic, \'ondu ticket\' = one ticket, \'kodi\' = give.',
        reply: '"Majestic ge ondu ticket kodi" (ಮೆಜೆಸ್ಟಿಕ್ ಗೆ ಒಂದು ಟಿಕೆಟ್ ಕೊಡಿ)',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish: '"Mundina stop alli nillisi" (ಮುಂದಿನ ಸ್ಟಾಪ್ ಅಲ್ಲಿ ನಿಲ್ಲಿಸಿ)',
        script: 'ಮುಂದಿನ ಸ್ಟಾಪ್ ಅಲ್ಲಿ ನಿಲ್ಲಿಸಿ',
        english:
          'Means "stop at the next stop" — \'mundina stop\' = next stop, \'alli\' = there, \'nillisi\' = stop.',
        reply: '"Mundina stop alli nillisi" (ಮುಂದಿನ ಸ್ಟಾಪ್ ಅಲ್ಲಿ ನಿಲ್ಲಿಸಿ)',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish: '"Ee bus Indiranagar hogutta?" (ಈ ಬಸ್ ಇಂದಿರಾನಗರ ಹೋಗುತ್ತಾ?)',
        script: 'ಈ ಬಸ್ ಇಂದಿರಾನಗರ ಹೋಗುತ್ತಾ?',
        english:
          'Means "does this bus go to Indiranagar?" — \'ee bus\' = this bus, \'hogutta\' = does it go.',
        reply: '"Ee bus Indiranagar hogutta?" (ಈ ಬಸ್ ಇಂದಿರಾನಗರ ಹೋಗುತ್ತಾ?)',
        correction: null,
        mood: 'excited',
      },
    ], offlineReason);
  }

  // 16. Waiter / bill / restaurant questions
  if (
    /\b(waiter|bill|order|menu|less\s+sugar|no\s+sugar|parcel|takeaway|mangana)\b/i.test(
      lower
    )
  ) {
    return pickCannedVariant('waiter_order', [
      {
        kanglish: '"Bill kodi" (ಬಿಲ್ ಕೊಡಿ)',
        script: 'ಬಿಲ್ ಕೊಡಿ',
        english:
          'Means "give the bill" — \'kodi\' = give. Say this to the waiter when you are ready to pay.',
        reply: '"Bill kodi" (ಬಿಲ್ ಕೊಡಿ)',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish: '"Ondu masala dose kodi" (ಒಂದು ಮಸಾಲ ದೋಸೆ ಕೊಡಿ)',
        script: 'ಒಂದು ಮಸಾಲ ದೋಸೆ ಕೊಡಿ',
        english:
          'Means "give me one masala dosa" — \'ondu\' = one, \'masala dose\' = masala dosa, \'kodi\' = give.',
        reply: '"Ondu masala dose kodi" (ಒಂದು ಮಸಾಲ ದೋಸೆ ಕೊಡಿ)',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish: '"Sakkare kammi haaki" (ಸಕ್ಕರೆ ಕಮ್ಮಿ ಹಾಕಿ)',
        script: 'ಸಕ್ಕರೆ ಕಮ್ಮಿ ಹಾಕಿ',
        english:
          'Means "put less sugar" — \'sakkare\' = sugar, \'kammi\' = less, \'haaki\' = put.',
        reply: '"Sakkare kammi haaki" (ಸಕ್ಕರೆ ಕಮ್ಮಿ ಹಾಕಿ)',
        correction: null,
        mood: 'excited',
      },
    ], offlineReason);
  }

  // 17. "How do I say / ask..." or translation requests in English
  if (
    /\b(how\s+do\s+i\s+(say|ask|tell)|how\s+to\s+(say|ask|tell)|in\s+kannada|translate|meaning\s+of)\b/i.test(
      lower
    )
  ) {
    return pickCannedVariant('how_to_say_general', [
      {
        kanglish: '"Idakke eshtu?" (ಇದಕ್ಕೆ ಎಷ್ಟು?)',
        script: 'ಇದಕ್ಕೆ ಎಷ್ಟು?',
        english:
          'Means "how much for this?" — \'idakke\' = for this, \'eshtu\' = how much. Works at any shop or auto!',
        reply: '"Idakke eshtu?" (ಇದಕ್ಕೆ ಎಷ್ಟು?)',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish: '"Nanage idu beku" (ನನಗೆ ಇದು ಬೇಕು)',
        script: 'ನನಗೆ ಇದು ಬೇಕು',
        english:
          'Means "I want this" — \'nanage\' = to me, \'idu\' = this, \'beku\' = want.',
        reply: '"Nanage idu beku" (ನನಗೆ ಇದು ಬೇಕು)',
        correction: null,
        mood: 'excited',
      },
      {
        kanglish: '"Illi nillisi" (ಇಲ್ಲಿ ನಿಲ್ಲಿಸಿ)',
        script: 'ಇಲ್ಲಿ ನಿಲ್ಲಿಸಿ',
        english:
          'Means "stop right here" — \'illi\' = here, \'nillisi\' = stop. Tell the auto or bus driver!',
        reply: '"Illi nillisi" (ಇಲ್ಲಿ ನಿಲ್ಲಿಸಿ)',
        correction: null,
        mood: 'happy',
      },
    ], offlineReason);
  }

  // 18. Help / what can you do
  if (
    /\b(help|what\s+can\s+you\s+do|what\s+do\s+you\s+do|can\s+you\s+help|teach\s+me|how\s+to\s+use)\b/i.test(
      lower
    )
  ) {
    return pickCannedVariant('help_capabilities', [
      {
        kanglish: '"Naanu Kannada helikodtini" (ನಾನು ಕನ್ನಡ ಹೇಳಿಕೊಡ್ತೀನಿ)',
        script: 'ನಾನು ಕನ್ನಡ ಹೇಳಿಕೊಡ್ತೀನಿ',
        english:
          'Means "I will teach you Kannada" — \'naanu\' = I, \'helikodtini\' = will teach. Ask me any everyday phrase in the Kaliyona app!',
        reply: '"Naanu Kannada helikodtini" (ನಾನು ಕನ್ನಡ ಹೇಳಿಕೊಡ್ತೀನಿ)',
        correction: null,
        mood: 'happy',
      },
    ], offlineReason);
  }

  // 19. Dynamic English-to-Kanglish fallback: directly answers whatever the user wrote in English!
  const dynamicReply = userTranscript.trim()
    ? replyToPersona(null, userTranscript, [])
    : buildDynamicEnglishReply('Hello Anna', null);

  return {
    kanglish: dynamicReply.kanglish,
    script: dynamicReply.script,
    english: dynamicReply.english,
    reply: dynamicReply.kanglish,
    correction: null,
    mood: dynamicReply.mood || 'happy',
    source: 'canned',
    offlineReason,
  };
}

/**
 * Dev-mode Auditor: lists all canned replies in a console.table at load
 * and verifies every entry has a non-empty script field.
 */
let hasAuditedCanned = false;
export function auditCannedRepliesDevTable(): void {
  if (hasAuditedCanned) return;
  hasAuditedCanned = true;

  const sampleCategories = [
    'neeru hogu',
    'illi nillu',
    'who are you',
    'how are you',
    'what is your name',
    'thank you',
    'bye',
    'hello',
    'namaskara',
    'weather',
    'traffic',
    'meter',
    'is kanglish easy',
    'do you like bengaluru',
    'what is your favourite food',
    'where is majestic',
    'oota',
    'help',
    'unknown',
  ];

  const tableData: Array<{ Category: string; Kanglish: string; Script: string; English: string; ValidScript: boolean }> = [];
  let missingScriptCount = 0;

  for (const cat of sampleCategories) {
    const reply = getCannedAnnaReply(cat, 'dev-audit');
    const valid = Boolean(reply.script && reply.script.trim().length > 0);
    if (!valid) missingScriptCount++;
    tableData.push({
      Category: cat,
      Kanglish: reply.kanglish,
      Script: reply.script || 'MISSING',
      English: reply.english,
      ValidScript: valid,
    });
  }

  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    console.table(tableData);
    if (missingScriptCount > 0) {
      console.warn(`[Canned Audit] WARNING: Found ${missingScriptCount} canned replies missing native Kannada script!`);
    } else {
      console.info('[Canned Audit] All canned replies verified with valid native Kannada script!');
    }
  }
}

// Auto-run audit in dev environment
if (typeof window !== 'undefined') {
  setTimeout(() => auditCannedRepliesDevTable(), 100);
}

/**
 * Parses Anna's two-part response (or legacy JSON fallback)
 * and strips the trailing [MOOD:...] line.
 */
function parseAnnaBrainJson(rawText: string): AnnaBrainReply {
  const aiResult = parseAnnaModelResponse(rawText);
  return {
    kanglish: aiResult.kanglish || aiResult.text,
    script: aiResult.script || undefined,
    english: aiResult.english || '',
    reply: aiResult.kanglish || aiResult.text,
    correction: null,
    mood: aiResult.mood || 'happy',
    explanation_lang: 'en',
    source: 'gemini',
  };
}

export interface AnnaPersonaContext {
  id: string;
  title: string;
  tagline?: string;
  setting?: string;
}

/**
 * Direct client-side Gemini call when /api/anna/chat is unreachable (e.g. static hosting)
 */
async function callClientSideGemini(
  userTranscript: string,
  history: AnnaChatTurn[],
  persona?: AnnaPersonaContext | null
): Promise<AnnaBrainReply | null> {
  const rawCandidate =
    VOICE_CONFIG.GEMINI_API_KEY ||
    (typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env.VITE_GEMINI_API_KEY as string)
      : '') ||
    (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '') ||
    '';
  const apiKey =
    rawCandidate &&
    rawCandidate !== 'PASTE_KEY_HERE' &&
    rawCandidate !== 'MY_GEMINI_API_KEY' &&
    rawCandidate !== 'YOUR_DEMO_API_KEY_HERE'
      ? rawCandidate.trim()
      : '';
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  for (const turn of history.slice(-8)) {
    if (!turn || !turn.text) continue;
    contents.push({
      role: turn.role === 'user' ? 'user' : 'model',
      parts: [{ text: String(turn.text) }],
    });
  }
  contents.push({
    role: 'user',
    parts: [{ text: userTranscript }],
  });

  const personaInstruction =
    persona && persona.title
      ? `${ANNA_SYSTEM_PROMPT}\n\nROLEPLAY CONTEXT: You are currently roleplaying as "${persona.title}" (${persona.tagline || 'Bengaluru local'}) in Bengaluru (${persona.setting || 'local spot'}). Stay in character while following all conversational and language mirroring rules above.`
      : ANNA_SYSTEM_PROMPT;

  const candidateModels = ['gemini-3.5-flash-lite', 'gemini-2.5-flash'];
  for (const m of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: m,
        contents,
        config: {
          systemInstruction: personaInstruction,
          temperature: 0.6,
        },
      });
      const rawText = (response.text || '').trim();
      if (rawText) {
        return parseAnnaBrainJson(rawText);
      }
    } catch (e) {
      console.warn(`[anna-brain] Client-side Gemini model ${m} failed:`, e);
    }
  }
  return null;
}

/**
 * A) chat(userTranscript, history, persona) -> calls BRAIN_MODEL with the Anna or roleplay persona prompt.
 * Keeps last 8 turns as history. Never throws to UI.
 */
export async function chatWithAnna(
  userTranscript: string,
  history: AnnaChatTurn[] = [],
  persona?: AnnaPersonaContext | null
): Promise<AnnaBrainReply> {
  const trimmed = (userTranscript || '').trim();
  if (!trimmed) {
    return getCannedAnnaReply('', 'offline: empty input', persona);
  }

  if (VOICE_CONFIG.MOCK_MODE) {
    await new Promise((r) => setTimeout(r, 320));
    return getCannedAnnaReply(trimmed, 'offline: mock mode active', persona);
  }

  // 1. OpenAI-compatible AI endpoint. Pollinations is the only supported
  // no-key endpoint; Kimi K3 requires a server key or a user override.
  const { apiKey: effectiveOpenAiKey } = resolveEffectiveApiKey();
  const configuredBaseUrl = getAiConfig().baseUrl;
  if (effectiveOpenAiKey || isZeroKeyFallback(configuredBaseUrl)) {
    try {
      const aiResult = await sendAnnaChatCompletion(
        trimmed,
        history.slice(-10).map((t) => ({
          role: t.role,
          text: t.text,
          kanglish: t.kanglish,
        }))
      );
      const kannadaLine = aiResult.kanglish || aiResult.text;
      return {
        kanglish: kannadaLine,
        script: aiResult.script || undefined,
        english: aiResult.english || '',
        reply: kannadaLine,
        correction: null,
        mood: aiResult.mood || 'happy',
        explanation_lang: 'en',
        source: 'gemini',
      };
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        err.message === 'DEMO_KEY_LIMIT_REACHED'
      ) {
        return {
          kanglish: DEMO_KEY_LIMIT_MESSAGE,
          script:
            'ಡೆಮೊ ಕೀ ಮಿತಿ ತಲುಪಿದೆ — ಮುಂದುವರಿಸಲು ಸೆಟ್ಟಿಂಗ್ಸ್‌ನಲ್ಲಿ ನಿಮ್ಮ API ಕೀ ಸೇರಿಸಿ',
          english: '',
          reply: DEMO_KEY_LIMIT_MESSAGE,
          correction: null,
          mood: 'neutral',
          explanation_lang: 'en',
          source: 'canned',
          offlineReason: 'demo_key_limit',
        };
      }
      throw err;
    }
  }

  const recentTurns = history.slice(-8);
  const payload = {
    userTranscript: trimmed,
    history: recentTurns,
    model: VOICE_CONFIG.BRAIN_MODEL,
    persona: persona || null,
  };

  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);

    const response = await fetch('/api/anna/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    window.clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && typeof data.rawText === 'string' && data.rawText.trim()) {
        try {
          return parseAnnaBrainJson(data.rawText);
        } catch (parseErr) {
          console.warn(
            '[anna-brain] Schema / JSON parse error on rawText:',
            parseErr,
            data.rawText
          );
        }
      }
    } else {
      const errText = await response.text().catch(() => '');
      console.warn(
        `[anna-brain] Backend HTTP ${response.status} (${response.statusText}):`,
        errText
      );
      if ([401, 403, 429].includes(response.status)) {
        throw new Error(
          `ANNA_PROVIDER_HTTP_${response.status}: ${errText.slice(0, 180)}`
        );
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith('ANNA_PROVIDER_HTTP_')) {
      throw err;
    }
    console.warn(
      '[anna-brain] Backend /api/anna/chat unreachable, trying client-side Gemini:',
      err
    );
  }

  // Fallback 1: Direct client-side Gemini SDK call (works on static hosts if API key is bundled)
  try {
    const clientGeminiReply = await callClientSideGemini(
      trimmed,
      recentTurns,
      persona
    );
    if (clientGeminiReply) {
      return clientGeminiReply;
    }
  } catch (clientErr) {
    console.warn('[anna-brain] Client-side Gemini fallback failed:', clientErr);
  }

  // Fallback 2: Smart persona-aware local reply engine
  return getCannedAnnaReply(trimmed, 'offline: smart local engine', persona);
}

/**
 * Computes a fun phonetic "closeness %" for display ONLY.
 * This must NEVER be used to decide pass/fail.
 */
export function computeFunClosenessPct(
  targetKn: string,
  userTranscript: string
): number {
  const cleanTarget = (targetKn || '').trim();
  const cleanSaid = (userTranscript || '').trim();
  if (!cleanTarget || !cleanSaid) return 0;

  const legacy = legacyStringScore([cleanSaid], cleanTarget, cleanTarget);
  return Math.max(0, Math.min(100, Math.round((legacy.similarity ?? 0) * 100)));
}

/**
 * B) scoreSpeakAttempt(targetKn, userTranscript) -> calls BRAIN_MODEL
 */
interface SpeakDebounceCacheEntry {
  timestamp: number;
  result: SemanticSpeakScoreResult;
}

const speakDebounceCache = new Map<string, SpeakDebounceCacheEntry>();

export async function scoreSpeakAttempt(
  targetKn: string,
  userTranscript: string
): Promise<SemanticSpeakScoreResult> {
  const cleanTarget = (targetKn || '').trim();
  const cleanSaid = (userTranscript || '').trim();
  const closenessPct = computeFunClosenessPct(cleanTarget, cleanSaid);

  const makeUnverifiedResult = (): SemanticSpeakScoreResult => ({
    match: false,
    unverified: true,
    feedback: ANNA_UNVERIFIED_MESSAGE,
    closenessPct,
    source: 'unverified',
  });

  if (!cleanSaid || VOICE_CONFIG.MOCK_MODE) {
    return makeUnverifiedResult();
  }

  // 5-second debounce
  const cacheKey = `${cleanTarget.toLowerCase()}:::${cleanSaid.toLowerCase()}`;
  const now = Date.now();
  const cached = speakDebounceCache.get(cacheKey);
  if (cached && now - cached.timestamp < 5000) {
    return cached.result;
  }

  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 7000);

    const response = await fetch('/api/anna/score-speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetKn: cleanTarget,
        userTranscript: cleanSaid,
        model: VOICE_CONFIG.BRAIN_MODEL,
        clientApiKey: VOICE_CONFIG.GEMINI_API_KEY,
      }),
      signal: controller.signal,
    });

    window.clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const rawText = (data?.rawText || '')
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    if (!rawText) {
      throw new Error('Empty response from brain score-speak endpoint');
    }

    const parsed = JSON.parse(rawText);
    if (typeof parsed.match !== 'boolean') {
      throw new Error('Brain response missing boolean match field');
    }

    const match = parsed.match === true;
    const feedback =
      typeof parsed.feedback === 'string' && parsed.feedback.trim()
        ? parsed.feedback.trim()
        : match
        ? 'Nice! A Bengaluru local would understand you right away.'
        : `Good try! Give "${cleanTarget}" another go.`;

    const result: SemanticSpeakScoreResult = {
      match,
      unverified: false,
      feedback,
      closenessPct,
      source: 'gemini',
    };

    speakDebounceCache.set(cacheKey, { timestamp: now, result });
    return result;
  } catch (err) {
    console.warn(
      '[anna-brain] Semantic speak scoring failed — treating attempt as unable to verify (never using local phonetic verdict):',
      err
    );
    return makeUnverifiedResult();
  }
}
