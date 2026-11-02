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
          'Naanu Anna guru! Ee app-ina talking avatar and nimma auto dost!',
        script:
          'ನಾನು ಅಣ್ಣ ಗುರು! ಈ ಆಪ್ ನ ಟಾಕಿಂಗ್ ಅವತಾರ್ ಅಂಡ್ ನಿಮ್ಮ ಆಟೋ ದೋಸ್ತ್!',
        english:
          "I'm Anna — this app's talking avatar and your auto dost! I look like a cute Bengaluru auto to make learning fun.",
        reply:
          'Naanu Anna guru! Ee app-ina talking avatar and nimma auto dost!',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish:
          'Naanu nimma virtual Kanglish guru Anna! Yellow-and-green auto avatar naanu!',
        script:
          'ನಾನು ನಿಮ್ಮ ವರ್ಚುವಲ್ ಕಾಂಗ್ಲಿಷ್ ಗುರು ಅಣ್ಣ! ಯೆಲ್ಲೋ ಅಂಡ್ ಗ್ರೀನ್ ಆಟೋ ಅವತಾರ್ ನಾನು!',
        english:
          "I'm your virtual Kanglish guide Anna! A cheerful yellow-and-green auto mascot here to chat and teach.",
        reply:
          'Naanu nimma virtual Kanglish guru Anna! Yellow-and-green auto avatar naanu!',
        correction: null,
        mood: 'excited',
      },
      {
        kanglish:
          'Anna naanu! Ee app-ina friendly auto avatar — illi nimage Kannada helikododu nanna kelsa!',
        script:
          'ಅಣ್ಣ ನಾನು! ಈ ಆಪ್ ನ ಫ್ರೆಂಡ್ಲಿ ಆಟೋ ಅವತಾರ್ — ಇಲ್ಲಿ ನಿಮಗೆ ಕನ್ನಡ ಹೇಳಿಕೊಡೋದು ನನ್ನ ಕೆಲಸ!',
        english:
          "I'm Anna! This app's friendly auto avatar — teaching you Kannada while chatting is my passion!",
        reply:
          'Anna naanu! Ee app-ina friendly auto avatar — illi nimage Kannada helikododu nanna kelsa!',
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
        kanglish: 'Naanu chennagidini guru! Neevu hegiddira?',
        script: 'ನಾನು ಚೆನ್ನಾಗಿದ್ದೀನಿ ಗುರು! ನೀವು ಹೇಗಿದ್ದೀರಾ?',
        english: "I'm fine! How are you? ('chennagidini' = I'm fine)",
        reply: 'Naanu chennagidini guru! Neevu hegiddira?',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish: 'Full kushi aagidini guru! Nimma dina hegidde?',
        script: 'ಫುಲ್ ಖುಷಿ ಆಗಿದ್ದೀನಿ ಗುರು! ನಿಮ್ಮ ದಿನ ಹೇಗಿತ್ತು?',
        english: "I'm doing great friend! How has your day been?",
        reply: 'Full kushi aagidini guru! Nimma dina hegidde?',
        correction: null,
        mood: 'excited',
      },
      {
        kanglish: 'Tumba chennagidini guru! Kannada practice-ge ready ideera?',
        script: 'ತುಂಬಾ ಚೆನ್ನಾಗಿದ್ದೀನಿ ಗುರು! ಕನ್ನಡ ಪ್ರಾಕ್ಟೀಸ್ ಗೆ ರೆಡಿ ಇದ್ದೀರಾ?',
        english:
          "I'm doing very well friend! Are you ready for some Kannada chat?",
        reply:
          'Tumba chennagidini guru! Kannada practice-ge ready ideera?',
        correction: null,
        mood: 'happy',
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
        kanglish: 'Nanna hesaru Anna! Ee app-ina auto dost!',
        script: 'ನನ್ನ ಹೆಸರು ಅಣ್ಣ! ಈ ಆಪ್ ನ ಆಟೋ ದೋಸ್ತ್!',
        english: "My name is Anna! This app's auto friend!",
        reply: 'Nanna hesaru Anna! Ee app-ina auto dost!',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish: 'Ellaru nanna Auto Anna anta karithare guru!',
        script: 'ಎಲ್ಲರೂ ನನ್ನ ಆಟೋ ಅಣ್ಣ ಅಂತ ಕರೀತಾರೆ ಗುರು!',
        english: 'Everyone calls me Auto Anna, friend!',
        reply: 'Ellaru nanna Auto Anna anta karithare guru!',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish: 'Nanna hesaru Anna — nimma Bengaluru auto companion!',
        script: 'ನನ್ನ ಹೆಸರು ಅಣ್ಣ — ನಿಮ್ಮ ಬೆಂಗಳೂರು ಆಟೋ ಕಾಂಪ್ಯಾನಿಯನ್!',
        english: 'My name is Anna — your Bengaluru auto companion!',
        reply: 'Nanna hesaru Anna — nimma Bengaluru auto companion!',
        correction: null,
        mood: 'excited',
      },
    ]);
  }

  // 6. Small talk: "thank you" / "thanks"
  if (
    /\b(thanks|thank\s+you|thanku|dhanyavada|parvagilla)\b|ಧನ್ಯವಾದ/.test(lower)
  ) {
    return pickCannedVariant('thanks', [
      {
        kanglish: 'Parvagilla guru! Kushi aagi kaliyiri!',
        script: 'ಪರವಾಗಿಲ್ಲ ಗುರು! ಖುಷಿ ಆಗಿ ಕಲಿಯಿರಿ!',
        english: 'No problem friend! Learn happily!',
        reply: 'Parvagilla guru! Kushi aagi kaliyiri!',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish: 'Dhanyavada nimage kooda guru! Eega innu swalpa matanadona?',
        script: 'ಧನ್ಯವಾದ ನಿಮಗೂ ಕೂಡ ಗುರು! ಈಗ ಇನ್ನೂ ಸ್ವಲ್ಪ ಮಾತಾಡೋಣ?',
        english:
          'Thank you to you too friend! Shall we chat a bit more?',
        reply:
          'Dhanyavada nimage kooda guru! Eega innu swalpa matanadona?',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish: 'Mention maadbidi guru, naavu Bengaluru dosti alva!',
        script: 'ಮೆನ್ಷನ್ ಮಾಡ್ಬೇಡಿ ಗುರು, ನಾವು ಬೆಂಗಳೂರು ದೋಸ್ತಿ ಅಲ್ವಾ!',
        english:
          "Don't mention it friend, we're Bengaluru buddies after all!",
        reply: 'Mention maadbidi guru, naavu Bengaluru dosti alva!',
        correction: null,
        mood: 'excited',
      },
    ]);
  }

  // 7. Small talk: "bye" / goodbye
  if (
    /\b(bye|goodbye|see\s+you|hogbittu|bartini|sigona|shubha)\b/.test(lower)
  ) {
    return pickCannedVariant('bye', [
      {
        kanglish: 'Hogi bartini guru!',
        script: 'ಹೋಗಿ ಬರ್ತೀನಿ ಗುರು!',
        english: 'See you soon!',
        reply: 'Hogi bartini guru!',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish: 'Sari guru, aamele sigona! Take care!',
        script: 'ಸರಿ ಗುರು, ಆಮೇಲೆ ಸಿಗೋಣ! Take care!',
        english: 'Alright friend, see you later! Take care!',
        reply: 'Sari guru, aamele sigona! Take care!',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish: 'Hogbittu banni guru! Namma auto sadha ready ide!',
        script: 'ಹೋಗ್ಬಿಟ್ಟು ಬನ್ನಿ ಗುರು! ನಮ್ಮ ಆಟೋ ಸದಾ ರೆಡಿ ಇದೆ!',
        english:
          'Go and come back safely! Our auto is always ready for you!',
        reply: 'Hogbittu banni guru! Namma auto sadha ready ide!',
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
        kanglish:
          "Hello guru! Speak in Kanglish — try saying 'namaskara'! Hegiddira?",
        script:
          "ಹಲೋ ಗುರು! ಕಾಂಗ್ಲಿಷ್ ನಲ್ಲೀ ಹೇಳಿ — 'ನಮಸ್ಕಾರ' ಟ್ರೈ ಮಾಡಿ! ಹೇಗಿದ್ದೀರಾ?",
        english:
          "Hi! Say it in Kanglish — try 'namaskara', it means hello! How are you?",
        reply:
          "Hello guru! Speak in Kanglish — try saying 'namaskara'! Hegiddira?",
        correction: null,
        mood: 'happy',
      },
      {
        kanglish: "Hey guru! Welcome! Kanglish alli 'namaskara' helbodu!",
        script:
          "ಹೇ ಗುರು! ವೆಲ್ಕಮ್! ಕಾಂಗ್ಲಿಷ್ ನಲ್ಲಿ 'ನಮಸ್ಕಾರ' ಹೇಳಬಹುದು!",
        english:
          "Hey friend! Welcome! In Kanglish you can say 'namaskara'!",
        reply: "Hey guru! Welcome! Kanglish alli 'namaskara' helbodu!",
        correction: null,
        mood: 'happy',
      },
      {
        kanglish:
          "Hello saar! Banni banni, 'namaskara' inda start maadona!",
        script:
          "ಹಲೋ ಸರ್! ಬನ್ನಿ ಬನ್ನಿ, 'ನಮಸ್ಕಾರ' ದಿಂದ ಸ್ಟಾರ್ಟ್ ಮಾಡೋಣ!",
        english: "Hello! Come on in, let's start with 'namaskara'!",
        reply: "Hello saar! Banni banni, 'namaskara' inda start maadona!",
        correction: null,
        mood: 'excited',
      },
    ]);
  }

  // 9. Kanglish greetings ("namaskara", "namaste")
  if (/\b(namaskara|namaste)\b|ನಮಸ್ಕಾರ/.test(lower)) {
    return pickCannedVariant('kanglish_greeting', [
      {
        kanglish: 'Namaskara guru! Hegiddira? Auto ready ide!',
        script: 'ನಮಸ್ಕಾರ ಗುರು! ಹೇಗಿದ್ದೀರಾ? ಆಟೋ ರೆಡಿ ಇದೆ!',
        english: 'Hello friend! How are you? The auto is ready!',
        reply: 'Namaskara guru! Hegiddira? Auto ready ide!',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish: 'Namaskara! Banni guru, ivattu enu vishaya?',
        script: 'ನಮಸ್ಕಾರ! ಬನ್ನಿ ಗುರು, ಇವತ್ತು ಏನು ವಿಷಯ?',
        english: "Greetings! Come friend, what's on your mind today?",
        reply: 'Namaskara! Banni guru, ivattu enu vishaya?',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish: 'Namaskara saar! Auto hattiri, ellige hogbeku ivattu?',
        script: 'ನಮಸ್ಕಾರ ಸರ್! ಆಟೋ ಹತ್ತಿರಿ, ಎಲ್ಲಿಗೆ ಹೋಗಬೇಕು ಇವತ್ತು?',
        english:
          'Greetings sir! Hop in the auto, where shall we head today?',
        reply: 'Namaskara saar! Auto hattiri, ellige hogbeku ivattu?',
        correction: null,
        mood: 'excited',
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
          '"Metre mele hattu jasti" (ಮೀಟರ್ ಮೇಲೆ ಹತ್ತು ಜಾಸ್ತಿ)\nMatlab "meter pe dus extra" — \'metre mele\' = on the meter, \'hattu jasti\' = ten extra. Auto wale ko seedha bol do. 😄',
        script: 'ಮೀಟರ್ ಮೇಲೆ ಹತ್ತು ಜಾಸ್ತಿ',
        english: '',
        reply:
          '"Metre mele hattu jasti" (ಮೀಟರ್ ಮೇಲೆ ಹತ್ತು ಜಾಸ್ತಿ)\nMatlab "meter pe dus extra" — \'metre mele\' = on the meter, \'hattu jasti\' = ten extra. Auto wale ko seedha bol do. 😄',
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
        kanglish:
          '"Metre haaki" (ಮೀಟರ್ ಹಾಕಿ)\nMeans "put on the meter" — \'metre\' = meter, \'haaki\' = put on. Say this right when you hop in!',
        script: 'ಮೀಟರ್ ಹಾಕಿ',
        english: '',
        reply:
          '"Metre haaki" (ಮೀಟರ್ ಹಾಕಿ)\nMeans "put on the meter" — \'metre\' = meter, \'haaki\' = put on. Say this right when you hop in!',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish:
          '"UPI scan ideya?" (ಯುಪಿಐ ಸ್ಕ್ಯಾನ್ ಇದೆಯಾ?)\nMeans "is UPI scan available?" — \'UPI scan\' = QR scan, \'ideya\' = is there. Easy way to pay!',
        script: 'ಯುಪಿಐ ಸ್ಕ್ಯಾನ್ ಇದೆಯಾ?',
        english: '',
        reply:
          '"UPI scan ideya?" (ಯುಪಿಐ ಸ್ಕ್ಯಾನ್ ಇದೆಯಾ?)\nMeans "is UPI scan available?" — \'UPI scan\' = QR scan, \'ideya\' = is there. Easy way to pay!',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish:
          '"Metre mele hattu jasti" (ಮೀಟರ್ ಮೇಲೆ ಹತ್ತು ಜಾಸ್ತಿ)\nMeans "ten extra on the meter" — \'metre mele\' = on the meter, \'hattu jasti\' = ten extra.',
        script: 'ಮೀಟರ್ ಮೇಲೆ ಹತ್ತು ಜಾಸ್ತಿ',
        english: '',
        reply:
          '"Metre mele hattu jasti" (ಮೀಟರ್ ಮೇಲೆ ಹತ್ತು ಜಾಸ್ತಿ)\nMeans "ten extra on the meter" — \'metre mele\' = on the meter, \'hattu jasti\' = ten extra.',
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
        kanglish:
          'Haudu guru! Kanglish alli conversation madodu tumba sulabha alva?',
        script:
          'ಹೌದು ಗುರು! ಕಾಂಗ್ಲಿಷ್ ನಲ್ಲಿ ಕಾನ್ವರ್ಸೇಷನ್ ಮಾಡೋದು ತುಂಬಾ ಸುಲಭ ಅಲ್ವಾ?',
        english:
          "Yes friend! Having a conversation in Kanglish is quite easy, isn't it?",
        reply:
          'Haudu guru! Kanglish alli conversation madodu tumba sulabha alva?',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish:
          'Swalpa kashta aadre rooja practice maadidre tumba sulabha guru!',
        script:
          'ಸ್ವಲ್ಪ ಕಷ್ಟ ಆದ್ರೆ ರೋಜಾ ಪ್ರಾಕ್ಟೀಸ್ ಮಾಡಿದ್ರೆ ತುಂಬಾ ಸುಲಭ ಗುರು!',
        english:
          "A bit hard at first, but practice daily and it's super easy!",
        reply:
          'Swalpa kashta aadre rooja practice maadidre tumba sulabha guru!',
        correction: null,
        mood: 'excited',
      },
      {
        kanglish:
          'Nanna jothe matanadi guru, 10 days alli fluent aagthira!',
        script:
          'ನನ್ನ ಜೊತೆ ಮಾತಾಡಿ ಗುರು, ೧೦ ಡೇಸ್ ನಲ್ಲಿ ಫ್ಲೂಯೆಂಟ್ ಆಗ್ತೀರಾ!',
        english:
          'Chat with me friend, you will become fluent in 10 days!',
        reply:
          'Nanna jothe matanadi guru, 10 days alli fluent aagthira!',
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
        kanglish: 'Tumba ishta guru! Bengaluru nanna ooru, weather super ide!',
        script:
          'ತುಂಬಾ ಇಷ್ಟ ಗುರು! ಬೆಂಗಳೂರು ನನ್ನ ಊರು, ವೆದರ್ ಸೂಪರ್ ಇದೆ!',
        english:
          'Love it! Bengaluru is my town, the weather is super!',
        reply: 'Tumba ishta guru! Bengaluru nanna ooru, weather super ide!',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish:
          'Bengaluru andre premada nagara guru! Ellaru namma dosti!',
        script:
          'ಬೆಂಗಳೂರು ಅಂದ್ರೆ ಪ್ರೇಮದ ನಗರ ಗುರು! ಎಲ್ಲರೂ ನಮ್ಮ ದೋಸ್ತಿ!',
        english:
          'Bengaluru is a city of love! Everyone here is a friend!',
        reply:
          'Bengaluru andre premada nagara guru! Ellaru namma dosti!',
        correction: null,
        mood: 'excited',
      },
      {
        kanglish:
          'Haudu guru, namma Bengaluru ge yaaru ishta padalla heli?',
        script:
          'ಹೌದು ಗುರು, ನಮ್ಮ ಬೆಂಗಳೂರು ಗೆ ಯಾರು ಇಷ್ಟ ಪಡಲ್ಲ ಹೇಳಿ?',
        english: "Yes friend, who wouldn't love our Bengaluru?",
        reply:
          'Haudu guru, namma Bengaluru ge yaaru ishta padalla heli?',
        correction: null,
        mood: 'happy',
      },
    ], offlineReason);
  }

  // 12. Favourite / favorite
  if (/\b(favourite|favorite|fav|all-time\s+favorite)\b/i.test(lower)) {
    return pickCannedVariant('favourite', [
      {
        kanglish: 'Nanage masala dosa mattu filter coffee tumba ishta guru!',
        script:
          'ನನಗೆ ಮಸಾಲ ದೋಸೆ ಮತ್ತು ಫಿಲ್ಟರ್ ಕಾಫಿ ತುಂಬಾ ಇಷ್ಟ ಗುರು!',
        english:
          'I love crispy masala dosa and filter coffee, friend!',
        reply: 'Nanage masala dosa mattu filter coffee tumba ishta guru!',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish:
          'Cubbon Park alli auto drive madodu nanna all-time favourite guru!',
        script:
          'ಕಬ್ಬನ್ ಪಾರ್ಕ್ ನಲ್ಲಿ ಆಟೋ ಡ್ರೈವ್ ಮಾಡೋದು ನನ್ನ ಆಲ್ ಟೈಮ್ ಫೇವರಿಟ್ ಗುರು!',
        english:
          'Driving the auto through Cubbon Park is my all-time favorite!',
        reply:
          'Cubbon Park alli auto drive madodu nanna all-time favourite guru!',
        correction: null,
        mood: 'excited',
      },
      {
        kanglish: 'Bengaluru darshini oota nanna all-time favourite!',
        script:
          'ಬೆಂಗಳೂರು ದರ್ಶಿನಿ ಊಟ ನನ್ನ ಆಲ್ ಟೈಮ್ ಫೇವರಿಟ್!',
        english: 'Bengaluru darshini food is my all-time favorite!',
        reply: 'Bengaluru darshini oota nanna all-time favourite!',
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
        kanglish:
          'Majestic city centre alli ide guru, metro alli hogi sulabha!',
        script:
          'ಮೆಜೆಸ್ಟಿಕ್ ಸಿಟಿ ಸೆಂಟರ್ ನಲ್ಲಿ ಇದೆ ಗುರು, ಮೆಟ್ರೋ ನಲ್ಲಿ ಹೋಗಿ ಸುಲಭ!',
        english:
          'Majestic is in the city centre, take the metro for an easy ride!',
        reply:
          'Majestic city centre alli ide guru, metro alli hogi sulabha!',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish:
          'Map nodbekilla guru, naanu auto-li direct karkondu hogtini!',
        script:
          'ಮ್ಯಾಪ್ ನೋಡ್ಬೇಕಿಲ್ಲ ಗುರು, ನಾನು ಆಟೋ ಲಿ ಡೈರೆಕ್ಟ್ ಕರ್ಕೊಂಡು ಹೋಗ್ತೀನಿ!',
        english:
          "No need for maps friend, I'll take you directly in my auto!",
        reply:
          'Map nodbekilla guru, naanu auto-li direct karkondu hogtini!',
        correction: null,
        mood: 'excited',
      },
      {
        kanglish:
          'Namma Bengaluru alli straight hogi leftu rightu andre sigutte!',
        script:
          'ನಮ್ಮ ಬೆಂಗಳೂರು ನಲ್ಲಿ ಸ್ಟ್ರೈಟ್ ಹೋಗಿ ಲೆಫ್ಟ್ ರೈಟ್ ಅಂದ್ರೆ ಸಿಗುತ್ತೆ!',
        english:
          "In our Bengaluru, go straight then take a left or right and you'll find it!",
        reply:
          'Namma Bengaluru alli straight hogi leftu rightu andre sigutte!',
        correction: null,
        mood: 'neutral',
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
        kanglish:
          '"Ondu coffee kodi" (ಒಂದು ಕಾಫಿ ಕೊಡಿ)\nMeans "give me one coffee" — \'ondu\' = one, \'kodi\' = give. Works for anything: ondu tea kodi, ondu dosa kodi.',
        script: 'ಒಂದು ಕಾಫಿ ಕೊಡಿ',
        english: '',
        reply:
          '"Ondu coffee kodi" (ಒಂದು ಕಾಫಿ ಕೊಡಿ)\nMeans "give me one coffee" — \'ondu\' = one, \'kodi\' = give. Works for anything: ondu tea kodi, ondu dosa kodi.',
        correction: null,
        mood: 'excited',
      },
      {
        kanglish:
          '"Ondu masala dose kodi" (ಒಂದು ಮಸಾಲ ದೋಸೆ ಕೊಡಿ)\nMeans "give me one masala dosa" — \'ondu\' = one, \'masala dose\' = masala dosa, \'kodi\' = give.',
        script: 'ಒಂದು ಮಸಾಲ ದೋಸೆ ಕೊಡಿ',
        english: '',
        reply:
          '"Ondu masala dose kodi" (ಒಂದು ಮಸಾಲ ದೋಸೆ ಕೊಡಿ)\nMeans "give me one masala dosa" — \'ondu\' = one, \'masala dose\' = masala dosa, \'kodi\' = give.',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish:
          '"Oota aayta?" (ಊಟ ಆಯ್ತಾ?)\nMeans "had your meal?" — \'oota\' = meal, \'aayta\' = done. Best way to greet friends in Bengaluru!',
        script: 'ಊಟ ಆಯ್ತಾ?',
        english: '',
        reply:
          '"Oota aayta?" (ಊಟ ಆಯ್ತಾ?)\nMeans "had your meal?" — \'oota\' = meal, \'aayta\' = done. Best way to greet friends in Bengaluru!',
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
        kanglish:
          '"Majestic ge ondu ticket kodi" (ಮೆಜೆಸ್ಟಿಕ್ ಗೆ ಒಂದು ಟಿಕೆಟ್ ಕೊಡಿ)\nMeans "give one ticket to Majestic" — \'Majestic ge\' = to Majestic, \'ondu ticket\' = one ticket, \'kodi\' = give.',
        script: 'ಮೆಜೆಸ್ಟಿಕ್ ಗೆ ಒಂದು ಟಿಕೆಟ್ ಕೊಡಿ',
        english: '',
        reply:
          '"Majestic ge ondu ticket kodi" (ಮೆಜೆಸ್ಟಿಕ್ ಗೆ ಒಂದು ಟಿಕೆಟ್ ಕೊಡಿ)\nMeans "give one ticket to Majestic" — \'Majestic ge\' = to Majestic, \'ondu ticket\' = one ticket, \'kodi\' = give.',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish:
          '"Mundina stop alli nillisi" (ಮುಂದಿನ ಸ್ಟಾಪ್ ಅಲ್ಲಿ ನಿಲ್ಲಿಸಿ)\nMeans "stop at the next stop" — \'mundina stop\' = next stop, \'alli\' = there, \'nillisi\' = stop.',
        script: 'ಮುಂದಿನ ಸ್ಟಾಪ್ ಅಲ್ಲಿ ನಿಲ್ಲಿಸಿ',
        english: '',
        reply:
          '"Mundina stop alli nillisi" (ಮುಂದಿನ ಸ್ಟಾಪ್ ಅಲ್ಲಿ ನಿಲ್ಲಿಸಿ)\nMeans "stop at the next stop" — \'mundina stop\' = next stop, \'alli\' = there, \'nillisi\' = stop.',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish:
          '"Ee bus Indiranagar hogutta?" (ಈ ಬಸ್ ಇಂದಿರಾನಗರ ಹೋಗುತ್ತಾ?)\nMeans "does this bus go to Indiranagar?" — \'ee bus\' = this bus, \'hogutta\' = does it go.',
        script: 'ಈ ಬಸ್ ಇಂದಿರಾನಗರ ಹೋಗುತ್ತಾ?',
        english: '',
        reply:
          '"Ee bus Indiranagar hogutta?" (ಈ ಬಸ್ ಇಂದಿರಾನಗರ ಹೋಗುತ್ತಾ?)\nMeans "does this bus go to Indiranagar?" — \'ee bus\' = this bus, \'hogutta\' = does it go.',
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
        kanglish:
          '"Bill kodi" (ಬಿಲ್ ಕೊಡಿ)\nMatlab "bill do" — \'kodi\' = do. Hotel mein haath utha ke seedha bol do, sab samajh jaate hai. 😄',
        script: 'ಬಿಲ್ ಕೊಡಿ',
        english: '',
        reply:
          '"Bill kodi" (ಬಿಲ್ ಕೊಡಿ)\nMatlab "bill do" — \'kodi\' = do. Hotel mein haath utha ke seedha bol do, sab samajh jaate hai. 😄',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish:
          '"Ondu masala dose kodi" (ಒಂದು ಮಸಾಲ ದೋಸೆ ಕೊಡಿ)\nMeans "give me one masala dosa" — \'ondu\' = one, \'masala dose\' = masala dosa, \'kodi\' = give.',
        script: 'ಒಂದು ಮಸಾಲ ದೋಸೆ ಕೊಡಿ',
        english: '',
        reply:
          '"Ondu masala dose kodi" (ಒಂದು ಮಸಾಲ ದೋಸೆ ಕೊಡಿ)\nMeans "give me one masala dosa" — \'ondu\' = one, \'masala dose\' = masala dosa, \'kodi\' = give.',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish:
          '"Sakkare kammi haaki" (ಸಕ್ಕರೆ ಕಮ್ಮಿ ಹಾಕಿ)\nMeans "put less sugar" — \'sakkare\' = sugar, \'kammi\' = less, \'haaki\' = put.',
        script: 'ಸಕ್ಕರೆ ಕಮ್ಮಿ ಹಾಕಿ',
        english: '',
        reply:
          '"Sakkare kammi haaki" (ಸಕ್ಕರೆ ಕಮ್ಮಿ ಹಾಕಿ)\nMeans "put less sugar" — \'sakkare\' = sugar, \'kammi\' = less, \'haaki\' = put.',
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
        kanglish:
          '"Idakke eshtu?" (ಇದಕ್ಕೆ ಎಷ್ಟು?)\nMeans "how much for this?" — \'idakke\' = for this, \'eshtu\' = how much. Works at any shop or auto!',
        script: 'ಇದಕ್ಕೆ ಎಷ್ಟು?',
        english: '',
        reply:
          '"Idakke eshtu?" (ಇದಕ್ಕೆ ಎಷ್ಟು?)\nMeans "how much for this?" — \'idakke\' = for this, \'eshtu\' = how much. Works at any shop or auto!',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish:
          '"Nanage idu beku" (ನನಗೆ ಇದು ಬೇಕು)\nMeans "I want this" — \'nanage\' = to me, \'idu\' = this, \'beku\' = want.',
        script: 'ನನಗೆ ಇದು ಬೇಕು',
        english: '',
        reply:
          '"Nanage idu beku" (ನನಗೆ ಇದು ಬೇಕು)\nMeans "I want this" — \'nanage\' = to me, \'idu\' = this, \'beku\' = want.',
        correction: null,
        mood: 'excited',
      },
      {
        kanglish:
          '"Illi nillisi" (ಇಲ್ಲಿ ನಿಲ್ಲಿಸಿ)\nMeans "stop right here" — \'illi\' = here, \'nillisi\' = stop. Tell the auto or bus driver!',
        script: 'ಇಲ್ಲಿ ನಿಲ್ಲಿಸಿ',
        english: '',
        reply:
          '"Illi nillisi" (ಇಲ್ಲಿ ನಿಲ್ಲಿಸಿ)\nMeans "stop right here" — \'illi\' = here, \'nillisi\' = stop. Tell the auto or bus driver!',
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
        kanglish:
          'Naanu nimge real Bengaluru Kanglish helkodtini guru, auto rides inda food varge!',
        script:
          'ನಾನು ನಿಮಗೆ ರಿಯಲ್ ಬೆಂಗಳೂರು ಕಾಂಗ್ಲಿಷ್ ಹೇಳಿಕೊಡ್ತೀನಿ ಗುರು, ಆಟೋ ರೈಡ್ಸ್ ಇಂದ ಫುಡ್ ವರೆಗೆ!',
        english:
          'I will teach you real Bengaluru Kanglish, from auto rides to food!',
        reply:
          'Naanu nimge real Bengaluru Kanglish helkodtini guru, auto rides inda food varge!',
        correction: null,
        mood: 'happy',
      },
      {
        kanglish:
          'Kanglish or English alli matanadi — naanu guide maadtini!',
        script:
          'ಕಾಂಗ್ಲಿಷ್ ಆರ್ ಇಂಗ್ಲಿಷ್ ನಲ್ಲಿ ಮಾತಾಡಿ — ನಾನು ಗೈಡ್ ಮಾಡ್ತೀನಿ!',
        english:
          'Speak in Kanglish or English — I will guide you!',
        reply:
          'Kanglish or English alli matanadi — naanu guide maadtini!',
        correction: null,
        mood: 'excited',
      },
      {
        kanglish:
          'Nimma auto dost naanu! Daily practice maadi, doubts keli!',
        script:
          'ನಿಮ್ಮ ಆಟೋ ದೋಸ್ತ್ ನಾನು! ಡೈಲಿ ಪ್ರಾಕ್ಟೀಸ್ ಮಾಡಿ, ಡೌಟ್ಸ್ ಕೇಳಿ!',
        english:
          "I'm your auto friend! Practice daily and ask any doubts!",
        reply:
          'Nimma auto dost naanu! Daily practice maadi, doubts keli!',
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
 * Parses Anna's plain-text conversational response (or legacy JSON fallback)
 * and strips the trailing [MOOD:...] line.
 */
function parseAnnaBrainJson(rawText: string): AnnaBrainReply {
  const aiResult = parseAnnaModelResponse(rawText);
  return {
    kanglish: aiResult.text || aiResult.kanglish,
    script: aiResult.script || undefined,
    english: '',
    reply: aiResult.text || aiResult.kanglish,
    correction: null,
    mood: aiResult.mood || 'happy',
    explanation_lang: aiResult.explanation_lang || 'en',
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
  const apiKey =
    VOICE_CONFIG.GEMINI_API_KEY ||
    (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '') ||
    '';
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

  const candidateModels = ['gemini-3-flash-preview', 'gemini-2.5-flash'];
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

  // 1. OpenAI-compatible AI Endpoint (User-saved key in localStorage -> else built-in default key VITE_ANNA_DEFAULT_KEY)
  const { apiKey: effectiveOpenAiKey } = resolveEffectiveApiKey();
  if (effectiveOpenAiKey) {
    try {
      const aiResult = await sendAnnaChatCompletion(
        trimmed,
        history.slice(-10).map((t) => ({
          role: t.role,
          text: t.text,
          kanglish: t.kanglish,
        }))
      );
      const conversationalText = aiResult.text || aiResult.kanglish;
      return {
        kanglish: conversationalText,
        script: aiResult.script || undefined,
        english: '',
        reply: conversationalText,
        correction: null,
        mood: aiResult.mood || 'happy',
        explanation_lang: aiResult.explanation_lang || 'en',
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
    }
  } catch (err: unknown) {
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
