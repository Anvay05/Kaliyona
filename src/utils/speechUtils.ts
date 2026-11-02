import { useState, useEffect } from 'react';
import {
  normalize,
  normalizeLatin,
  similarity as sharedSimilarity,
} from '@/lib/shared/matcher';
import {
  SpeechSupportState,
  MicButtonState,
  SpeechErrorKind,
  getSpeechRecognitionConstructor,
  isRunningInIframe,
  detectSpeechSupport,
  getCurrentSpeechSupportState,
} from './speechSupport';
import {
  speakScript,
  SpeakScriptOptions,
  CharacterVoiceId,
  getAnnaPersonalityPreset,
} from '../voice/anna-mouth';

export type {
  SpeechSupportState,
  MicButtonState,
  SpeechErrorKind,
  SpeakScriptOptions,
  CharacterVoiceId,
};
export {
  detectSpeechSupport,
  getCurrentSpeechSupportState,
  isRunningInIframe,
  speakScript,
  getAnnaPersonalityPreset,
};

let currentSpeakingText: string | null = null;
let speakingSafetyTimer: ReturnType<typeof setTimeout> | null = null;

type SpeechListener = (speakingText: string | null) => void;
const listeners = new Set<SpeechListener>();

function notifyListeners(text: string | null) {
  currentSpeakingText = text;
  listeners.forEach((fn) => fn(text));
}

export function subscribeToSpeakingState(listener: SpeechListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * React hook that returns whether TTS is currently speaking (globally or for a specific text).
 */
export function useSpeakingState(targetText?: string): {
  isSpeaking: boolean;
  isThisSpeaking: boolean;
  speakingText: string | null;
} {
  const [speakingText, setSpeakingText] = useState<string | null>(
    currentSpeakingText
  );

  useEffect(() => {
    return subscribeToSpeakingState(setSpeakingText);
  }, []);

  const isSpeaking = speakingText !== null;
  const isThisSpeaking =
    speakingText !== null &&
    (targetText === undefined || speakingText === targetText);

  return { isSpeaking, isThisSpeaking, speakingText };
}

export interface SpeakKannadaOptions {
  slow?: boolean;
  character?: CharacterVoiceId;
  fallbackTranslit?: string;
  itemId?: string;
  script?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onUnsupported?: () => void;
}

/**
 * Comprehensive Kanglish-to-Kannada-script lookup table for curriculum words and phrases.
 */
export const KANGLISH_TO_SCRIPT_MAP: Record<string, string> = {
  // Core greetings & polite essentials (Unit 1 - Unit 4)
  namaskara: 'ನಮಸ್ಕಾರ',
  'namaskara!': 'ನಮಸ್ಕಾರ!',
  hegiddira: 'ಹೇಗಿದ್ದೀರ',
  'hegiddira?': 'ಹೇಗಿದ್ದೀರ?',
  kaliyona: 'ಕಲಿಯೋಣ',
  ge: 'ಗೆ',
  swagata: 'ಸ್ವಾಗತ',
  'swagata!': 'ಸ್ವಾಗತ!',
  swaagata: 'ಸ್ವಾಗತ',
  'namaskara! hegiddira? kaliyona ge swagata!':
    'ನಮಸ್ಕಾರ! ಹೇಗಿದ್ದೀರ? ಕಲಿಯೋಣ ಗೆ ಸ್ವಾಗತ!',
  hegidya: 'ಹೇಗಿದ್ಯಾ',
  'hegidya?': 'ಹೇಗಿದ್ಯಾ?',
  chennagidini: 'ಚೆನ್ನಾಗಿದ್ದೀನಿ',
  chennagide: 'ಚೆನ್ನಾಗಿದೆ',
  chennagiddira: 'ಚೆನ್ನಾಗಿದ್ದೀರಾ',
  dhanyavada: 'ಧನ್ಯವಾದ',
  dhanyavaada: 'ಧನ್ಯವಾದ',
  dayavittu: 'ದಯವಿಟ್ಟು',
  haudu: 'ಹೌದು',
  houdu: 'ಹೌದು',
  illa: 'ಇಲ್ಲ',
  sari: 'ಸರಿ',
  beku: 'ಬೇಕು',
  beda: 'ಬೇಡ',
  eshtu: 'ಎಷ್ಟು',
  'eshtu?': 'ಎಷ್ಟು?',
  leftu: 'ಲೆಫ್ಟು',
  rightu: 'ರೈಟು',
  left: 'ಲೆಫ್ಟ್',
  right: 'ರೈಟ್',
  straight: 'ನೇರಾ',
  neera: 'ನೇರಾ',
  neeru: 'ನೀರು',
  nillisi: 'ನಿಲ್ಲಿಸಿ',
  nillu: 'ನಿಲ್ಲು',
  kodi: 'ಕೊಡಿ',
  kodu: 'ಕೊಡು',
  banni: 'ಬನ್ನಿ',
  baa: 'ಬಾ',
  hogi: 'ಹೋಗಿ',
  hogu: 'ಹೋಗು',
  hogona: 'ಹೋಗೋಣ',
  hogi_banni: 'ಹೋಗಿ ಬನ್ನಿ',
  'hogi banni': 'ಹೋಗಿ ಬನ್ನಿ',
  sigona: 'ಸಿಗೋಣ',
  'naale sigona': 'ನಾಳೆ ಸಿಗೋಣ',
  'naale banni': 'ನಾಳೆ ಬನ್ನಿ',

  // Pronouns & introductions
  naanu: 'ನಾನು',
  neevu: 'ನೀವು',
  neenu: 'ನೀನು',
  avaru: 'ಅವರು',
  ivaru: 'ಇವರು',
  avaLu: 'ಅವಳು',
  avalu: 'ಅವಳು',
  avanu: 'ಅವನು',
  naavu: 'ನಾವು',
  nanna: 'ನನ್ನ',
  ninna: 'ನಿನ್ನ',
  nimma: 'ನಿಮ್ಮ',
  namage: 'ನಮಗೆ',
  nanage: 'ನನಗೆ',
  ninage: 'ನಿನಗೆ',
  nimage: 'ನಿಮಗೆ',
  hesaru: 'ಹೆಸರು',
  'nanna hesaru': 'ನನ್ನ ಹೆಸರು',
  'nanna hesaru ___': 'ನನ್ನ ಹೆಸರು',
  'ninna hesaru enu?': 'ನಿನ್ನ ಹೆಸರು ಏನು?',
  'nimma hesaru enu?': 'ನಿಮ್ಮ ಹೆಸರು ಏನು?',
  enu: 'ಏನು',
  'enu?': 'ಏನು?',
  yaru: 'ಯಾರು',
  yaaru: 'ಯಾರು',
  elli: 'ಎಲ್ಲಿ',
  illi: 'ಇಲ್ಲಿ',
  ille: 'ಇಲ್ಲೇ',
  alli: 'ಅಲ್ಲಿ',
  alle: 'ಅಲ್ಲೇ',
  yaake: 'ಯಾಕೆ',
  yake: 'ಯಾಕೆ',
  yaavaga: 'ಯಾವಾಗ',
  yavaga: 'ಯಾವಾಗ',
  hege: 'ಹೇಗೆ',
  yaavudu: 'ಯಾವುದು',
  idu: 'ಇದು',
  adu: 'ಅದು',

  // Numbers
  ondu: 'ಒಂದು',
  eradu: 'ಎರಡು',
  mooru: 'ಮೂರು',
  muru: 'ಮೂರು',
  naalku: 'ನಾಲ್ಕು',
  nalku: 'ನಾಲ್ಕು',
  aidu: 'ಐದು',
  aaru: 'ಆರು',
  aru: 'ಆರು',
  elu: 'ಏಳು',
  eLu: 'ಏಳು',
  entu: 'ಎಂಟು',
  ombattu: 'ಒಂಬತ್ತು',
  hatthu: 'ಹತ್ತು',
  hattu: 'ಹತ್ತು',
  hannondu: 'ಹನ್ನೊಂದು',
  hanneradu: 'ಹನ್ನೆರಡು',
  hadimooru: 'ಹದಿಮೂರು',
  hadinaalku: 'ಹದಿನಾಲ್ಕು',
  hadinaidu: 'ಹದಿನೈದು',
  hadinaaru: 'ಹದಿನಾರು',
  hadinelu: 'ಹದಿನೇಳು',
  hadinentu: 'ಹದಿನೆಂಟು',
  hatthombattu: 'ಹತ್ತೊಂಬತ್ತು',
  ippatthu: 'ಇಪ್ಪತ್ತು',
  ippattu: 'ಇಪ್ಪತ್ತು',
  moovattu: 'ಮೂವತ್ತು',
  nalavattu: 'ನಲವತ್ತು',
  aivattu: 'ಐವತ್ತು',
  aravattu: 'ಅರವತ್ತು',
  eppattu: 'ಎಪ್ಪತ್ತು',
  embattu: 'ಎಂಬತ್ತು',
  tombattu: 'ತೊಂಬತ್ತು',
  nooru: 'ನೂರು',
  ardha: 'ಅರ್ಧ',

  // Food, drink & darshini
  oota: 'ಊಟ',
  thindi: 'ತಿಂಡಿ',
  tindi: 'ತಿಂಡಿ',
  kaapi: 'ಕಾಫಿ',
  coffee: 'ಕಾಫಿ',
  tea: 'ಟೀ',
  cha: 'ಚಾ',
  chai: 'ಚಾಯ್',
  paalu: 'ಪಾಲು',
  haalu: 'ಹಾಲು',
  mosaru: 'ಮೊಸರು',
  dose: 'ದೋಸೆ',
  dosa: 'ದೋಸೆ',
  idli: 'ಇಡ್ಲಿ',
  vade: 'ವಡೆ',
  bonda: 'ಬೋಂಡಾ',
  upma: 'ಉಪ್ಪಿಟ್ಟು',
  uppittu: 'ಉಪ್ಪಿಟ್ಟು',
  kesari: 'ಕೇಸರಿ',
  bath: 'ಬಾತ್',
  chutney: 'ಚಟ್ನಿ',
  sambar: 'ಸಾಂಬಾರ್',
  sambaru: 'ಸಾಂಬಾರು',
  benne: 'ಬೆಣ್ಣೆ',
  masale: 'ಮಸಾಲೆ',
  masala: 'ಮಸಾಲಾ',
  sakkare: 'ಸಕ್ಕರೆ',
  uppu: 'ಉಪ್ಪು',
  khara: 'ಖಾರ',
  bisi: 'ಬಿಸಿ',
  thanda: 'ತಂಡ',
  thinnu: 'ತಿನ್ನು',
  tinnu: 'ತಿನ್ನು',
  thindi_aaytha: 'ತಿಂಡಿ ಆಯ್ತಾ',
  'oota aaytha?': 'ಊಟ ಆಯ್ತಾ?',
  'oota aaytu': 'ಊಟ ಆಯ್ತು',
  kudi: 'ಕುಡಿ',
  bill: 'ಬಿಲ್',
  hotel: 'ಹೋಟೆಲ್',
  darshini: 'ದರ್ಶಿನಿ',

  // People, family & address terms
  anna: 'ಅಣ್ಣ',
  akka: 'ಅಕ್ಕ',
  amma: 'ಅಮ್ಮ',
  appa: 'ಅಪ್ಪ',
  thamma: 'ತಮ್ಮ',
  tamma: 'ತಮ್ಮ',
  thangi: 'ತಂಗಿ',
  tangi: 'ತಂಗಿ',
  guru: 'ಗುರು',
  boss: 'ಬಾಸ್',
  sir: 'ಸರ್',
  madam: 'ಮ್ಯಾಡಂ',
  geleya: 'ಗೆಳೆಯ',
  geleyaru: 'ಗೆಳೆಯರು',
  geleyathi: 'ಗೆಳತಿ',
  friend: 'ಫ್ರೆಂಡ್',
  makkalu: 'ಮಕ್ಕಳು',
  mane: 'ಮನೆ',

  // Auto, directions & places
  auto: 'ಆಟೋ',
  meter: 'ಮೀಟರ್',
  haaku: 'ಹಾಕು',
  haaki: 'ಹಾಕಿ',
  maadi: 'ಮಾಡಿ',
  maadu: 'ಮಾಡು',
  maadla: 'ಮಾಡ್ಲಾ',
  thagolli: 'ತಗೊಳ್ಳಿ',
  tagolli: 'ತಗೊಳ್ಳಿ',
  bidthira: 'ಬಿಡ್ತೀರಾ',
  barthira: 'ಬರ್ತೀರಾ',
  bartira: 'ಬರ್ತೀರಾ',
  barutte: 'ಬರುತ್ತೆ',
  baralla: 'ಬರಲ್ಲ',
  munde: 'ಮುಂದೆ',
  hinde: 'ಹಿಂದೆ',
  olage: 'ಒಳಗೆ',
  horage: 'ಹೊರಗೆ',
  mele: 'ಮೇಲೆ',
  kelage: 'ಕೆಳಗೆ',
  hatra: 'ಹತ್ರ',
  doora: 'ದೂರ',
  balagade: 'ಬಲಗಡೆ',
  edagade: 'ಎಡಗಡೆ',
  neravagi: 'ನೇರವಾಗಿ',
  bega: 'ಬೇಗ',
  nidhana: 'ನಿಧಾನ',
  swalpa: 'ಸ್ವಲ್ಪ',
  tumba: 'ತುಂಬಾ',
  thumba: 'ತುಂಬಾ',
  jaasti: 'ಜಾಸ್ತಿ',
  kammi: 'ಕಮ್ಮಿ',
  kadime: 'ಕಡಿಮೆ',
  duddu: 'ದುಡ್ಡು',
  chillare: 'ಚಿಲ್ಲರೆ',
  change: 'ಚೇಂಜ್',
  upi: 'ಯುಪಿಐ',
  cash: 'ಕ್ಯಾಶ್',
  station: 'ಸ್ಟೇಷನ್',
  metro: 'ಮೆಟ್ರೋ',
  airport: 'ಏರ್‌ಪೋರ್ಟ್',
  office: 'ಆಫೀಸ್',
  market: 'ಮಾರ್ಕೆಟ್',
  hospital: 'ಆಸ್ಪತ್ರೆ',
  road: 'ರೋಡ್',
  circle: 'ಸರ್ಕಲ್',
  cross: 'ಕ್ರಾಸ್',
  signal: 'ಸಿಗ್ನಲ್',
  main: 'ಮೇನ್',
  stop: 'ಸ್ಟಾಪ್',
  side: 'ಸೈಡ್',
  indiranagara: 'ಇಂದಿರಾನಗರ',
  'indiranagara-kke': 'ಇಂದಿರಾನಗರಕ್ಕೆ',
  koramangala: 'ಕೋರಮಂಗಲ',
  jayanagara: 'ಜಯನಗರ',
  majestic: 'ಮೆಜೆಸ್ಟಿಕ್',

  // Time, feelings & verbs
  iga: 'ಈಗ',
  eega: 'ಈಗ',
  naale: 'ನಾಳೆ',
  ivatthu: 'ಇವತ್ತು',
  ivattu: 'ಇವತ್ತು',
  ninne: 'ನಿನ್ನೆ',
  belagge: 'ಬೆಳಗ್ಗೆ',
  madhyahna: 'ಮಧ್ಯಾಹ್ನ',
  sanje: 'ಸಂಜೆ',
  rathri: 'ರಾತ್ರಿ',
  ratri: 'ರಾತ್ರಿ',
  gante: 'ಗಂಟೆ',
  ghante: 'ಗಂಟೆ',
  nimisha: 'ನಿಮಿಷ',
  dina: 'ದಿನ',
  vaara: 'ವಾರ',
  innu: 'ಇನ್ನೂ',
  aaga: 'ಆಗ',
  aamele: 'ಆಮೇಲೆ',
  ishta: 'ಇಷ್ಟ',
  gottu: 'ಗೊತ್ತು',
  gottilla: 'ಗೊತ್ತಿಲ್ಲ',
  arthavaytu: 'ಅರ್ಥವಾಯಿತು',
  artha: 'ಅರ್ಥ',
  sulabha: 'ಸುಲಭ',
  kasta: 'ಕಷ್ಟ',
  kashta: 'ಕಷ್ಟ',
  santosha: 'ಸಂತೋಷ',
  santhosha: 'ಸಂತೋಷ',
  bejaru: 'ಬೇಜಾರು',
  sakkath: 'ಸಕ್ಕತ್',
  super: 'ಸೂಪರ್',
  bombat: 'ಬೊಂಬಾಟ್',
  ide: 'ಇದೆ',
  idira: 'ಇದ್ದೀರಾ',
  idini: 'ಇದ್ದೀನಿ',
  aaythu: 'ಆಯ್ತು',
  aaytu: 'ಆಯ್ತು',
  aagalla: 'ಆಗಲ್ಲ',
  aagutte: 'ಆಗುತ್ತೆ',
  hogbeku: 'ಹೋಗಬೇಕು',
  barbeku: 'ಬರಬೇಕು',
  kodbeku: 'ಕೊಡಬೇಕು',
  maadbeku: 'ಮಾಡಬೇಕು',
  bekagide: 'ಬೇಕಾಗಿದೆ',
  kelsa: 'ಕೆಲಸ',
  kelasa: 'ಕೆಲಸ',
  kannada: 'ಕನ್ನಡ',
  english: 'ಇಂಗ್ಲಿಷ್',
  bengaluru: 'ಬೆಂಗಳೂರು',
  sorry: 'ಸಾರಿ',
  late: 'ಲೇಟ್',
  ok: 'ಓಕೆ',
  okay: 'ಓಕೆ',

  // Full survival sentences
  'munde swalpa left thagolli': 'ಮುಂದೆ ಸ್ವಲ್ಪ ಲೆಫ್ಟ್ ತಗೊಳ್ಳಿ',
  'munde swalpa right thagolli': 'ಮುಂದೆ ಸ್ವಲ್ಪ ರೈಟ್ ತಗೊಳ್ಳಿ',
  'munde neera hogi': 'ಮುಂದೆ ನೇರಾ ಹೋಗಿ',
  'ille nillisi anna': 'ಇಲ್ಲೇ ನಿಲ್ಲಿಸಿ ಅಣ್ಣ',
  'illi nillisi': 'ಇಲ್ಲಿ ನಿಲ್ಲಿಸಿ',
  'meter haaki anna': 'ಮೀಟರ್ ಹಾಕಿ ಅಣ್ಣ',
  'meter haaku': 'ಮೀಟರ್ ಹಾಕು',
  'meter haaku anna': 'ಮೀಟರ್ ಹಾಕು ಅಣ್ಣ',
  'meter haaku sir': 'ಮೀಟರ್ ಹಾಕು ಸರ್',
  'eshtu aaythu?': 'ಎಷ್ಟು ಆಯ್ತು?',
  'eshtu aaytu?': 'ಎಷ್ಟು ಆಯ್ತು?',
  'upi maadla?': 'ಯುಪಿಐ ಮಾಡ್ಲಾ?',
  'bega baa': 'ಬೇಗ ಬಾ',
  'nanage dose kodi': 'ನನಗೆ ದೋಸೆ ಕೊಡಿ',
  'nanage dose ishta': 'ನನಗೆ ದೋಸೆ ಇಷ್ಟ',
  'kannada sulabha': 'ಕನ್ನಡ ಸುಲಭ',
  'leftu maadi': 'ಲೆಫ್ಟು ಮಾಡಿ',
  'rightu maadi': 'ರೈಟು ಮಾಡಿ',
  'neera hogu': 'ನೇರಾ ಹೋಗು',
  'tumba bisi ide': 'ತುಂಬಾ ಬಿಸಿ ಇದೆ',
  'sorry, late aaytu': 'ಸಾರಿ, ಲೇಟ್ ಆಯ್ತು',
  'innu eshtu gante?': 'ಇನ್ನೂ ಎಷ್ಟು ಗಂಟೆ?',
  'ondu ardha gante': 'ಒಂದು ಅರ್ಧ ಗಂಟೆ',
  'tumba santosha': 'ತುಂಬಾ ಸಂತೋಷ',
  'airport hogbeku': 'ಏರ್‌ಪೋರ್ಟ್ ಹೋಗಬೇಕು',
  'metro station bartira?': 'ಮೆಟ್ರೋ ಸ್ಟೇಷನ್ ಬರ್ತೀರಾ?',
  'circle hatra': 'ಸರ್ಕಲ್ ಹತ್ರ',
};

const KANNADA_SCRIPT_REGEX = /[\u0C80-\u0CFF]/;

/**
 * Phonetic Kanglish token -> Kannada Unicode script converter for any word not in KANGLISH_TO_SCRIPT_MAP.
 * Ensures every curriculum word/sentence resolves to genuine Kannada script ([\u0C80-\u0CFF]).
 */
function transliterateWordToKannadaScript(rawWord: string): string {
  const clean = rawWord.replace(/[_-]/g, '').trim();
  if (!clean) return '';
  if (KANNADA_SCRIPT_REGEX.test(clean)) return clean;

  // Preserve trailing punctuation (?, !, .)
  const punctMatch = clean.match(/([?!.,]+)$/);
  const trailingPunct = punctMatch ? punctMatch[1] : '';
  const core = clean.replace(/[?!.,'"]/g, '').toLowerCase();
  if (!core) return '';

  if (KANGLISH_TO_SCRIPT_MAP[core]) {
    return KANGLISH_TO_SCRIPT_MAP[core] + trailingPunct;
  }

  // Handle common suffixes (-kke, -ge, -alli, -inda, -na)
  if (core.endsWith('kke') && core.length > 4) {
    const stem = core.slice(0, -3);
    if (KANGLISH_TO_SCRIPT_MAP[stem]) {
      return KANGLISH_TO_SCRIPT_MAP[stem] + 'ಕ್ಕೆ' + trailingPunct;
    }
  }

  const independentVowels: [string, string][] = [
    ['aa', 'ಆ'],
    ['ee', 'ಈ'],
    ['ii', 'ಈ'],
    ['oo', 'ಊ'],
    ['uu', 'ಊ'],
    ['ai', 'ಐ'],
    ['au', 'ಔ'],
    ['ou', 'ಔ'],
    ['ae', 'ಏ'],
    ['ea', 'ಏ'],
    ['oa', 'ಓ'],
    ['a', 'ಅ'],
    ['i', 'ಇ'],
    ['u', 'ಉ'],
    ['e', 'ಎ'],
    ['o', 'ಒ'],
  ];

  const vowelSigns: [string, string][] = [
    ['aa', 'ಾ'],
    ['ee', 'ೀ'],
    ['ii', 'ೀ'],
    ['oo', 'ೂ'],
    ['uu', 'ೂ'],
    ['ai', 'ೈ'],
    ['au', 'ೌ'],
    ['ou', 'ೌ'],
    ['ae', 'ೇ'],
    ['ea', 'ೇ'],
    ['oa', 'ೋ'],
    ['a', ''],
    ['i', 'ಿ'],
    ['u', 'ು'],
    ['e', 'ೆ'],
    ['o', 'ೊ'],
  ];

  const consonants: [string, string][] = [
    ['shh', 'ಷ'],
    ['chh', 'ಛ'],
    ['ksh', 'ಕ್ಷ'],
    ['kh', 'ಖ'],
    ['gh', 'ಘ'],
    ['ch', 'ಚ'],
    ['jh', 'ಝ'],
    ['th', 'ತ'],
    ['dh', 'ದ'],
    ['ph', 'ಫ'],
    ['bh', 'ಭ'],
    ['sh', 'ಶ'],
    ['ng', 'ಂಗ'],
    ['nj', 'ಂಜ'],
    ['nt', 'ಂಟ'],
    ['nd', 'ಂಡ'],
    ['mp', 'ಂಪ'],
    ['mb', 'ಂಬ'],
    ['kk', 'ಕ್ಕ'],
    ['gg', 'ಗ್ಗ'],
    ['cc', 'ಚ್ಚ'],
    ['jj', 'ಜ್ಜ'],
    ['tt', 'ಟ್ಟ'],
    ['dd', 'ಡ್ಡ'],
    ['nn', 'ನ್ನ'],
    ['pp', 'ಪ್ಪ'],
    ['bb', 'ಬ್ಬ'],
    ['mm', 'ಮ್ಮ'],
    ['yy', 'ಯ್ಯ'],
    ['rr', 'ರ್ರ'],
    ['ll', 'ಲ್ಲ'],
    ['vv', 'ವ್ವ'],
    ['ss', 'ಸ್ಸ'],
    ['k', 'ಕ'],
    ['g', 'ಗ'],
    ['j', 'ಜ'],
    ['t', 'ಟ'],
    ['d', 'ಡ'],
    ['n', 'ನ'],
    ['p', 'ಪ'],
    ['f', 'ಫ'],
    ['b', 'ಬ'],
    ['m', 'ಮ'],
    ['y', 'ಯ'],
    ['r', 'ರ'],
    ['l', 'ಲ'],
    ['v', 'ವ'],
    ['w', 'ವ'],
    ['s', 'ಸ'],
    ['z', 'ಜ'],
    ['h', 'ಹ'],
  ];

  let i = 0;
  let out = '';

  while (i < core.length) {
    // Check if starts with vowel (at word start or after another vowel)
    let matchedVowel = false;
    for (const [rom, kn] of independentVowels) {
      if (core.startsWith(rom, i)) {
        out += kn;
        i += rom.length;
        matchedVowel = true;
        break;
      }
    }
    if (matchedVowel) continue;

    // Check consonant
    let matchedCons: [string, string] | null = null;
    for (const pair of consonants) {
      if (core.startsWith(pair[0], i)) {
        matchedCons = pair;
        break;
      }
    }

    if (matchedCons) {
      const [romC, knC] = matchedCons;
      i += romC.length;

      // Check following vowel sign
      let matchedSign: [string, string] | null = null;
      for (const vPair of vowelSigns) {
        if (core.startsWith(vPair[0], i)) {
          matchedSign = vPair;
          break;
        }
      }

      if (matchedSign) {
        out += knC + matchedSign[1];
        i += matchedSign[0].length;
      } else {
        // Consonant cluster or word-final consonant -> add halant (್)
        out += knC + '್';
      }
      continue;
    }

    // Fallback skip unknown char
    i++;
  }

  return (out || 'ಕನ್ನಡ') + trailingPunct;
}

export function getKannadaScriptForText(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (KANNADA_SCRIPT_REGEX.test(trimmed)) {
    return trimmed;
  }

  const lower = trimmed.toLowerCase();
  if (KANGLISH_TO_SCRIPT_MAP[lower]) {
    return KANGLISH_TO_SCRIPT_MAP[lower];
  }

  const cleanKey = lower.replace(/[.,?!]/g, '').trim();
  if (KANGLISH_TO_SCRIPT_MAP[cleanKey]) {
    const punct = trimmed.match(/([?!.]+)$/)?.[1] || '';
    return KANGLISH_TO_SCRIPT_MAP[cleanKey] + punct;
  }

  // Convert word-by-word for phrases and sentences
  const words = trimmed
    .replace(/___+/g, '')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);

  if (words.length === 0) return null;

  const convertedWords = words
    .map((w) => transliterateWordToKannadaScript(w))
    .filter(Boolean);

  const joined = convertedWords.join(' ').trim();
  return KANNADA_SCRIPT_REGEX.test(joined) ? joined : null;
}

/**
 * 4.1 SPEECH OUTPUT (TTS) — speakKannada(text, options)
 * Strictly enforces that ONLY native Kannada script reaches speechSynthesis via speakScript().
 * If text is romanized and no native script is provided, logs a console.warn with itemId
 * and returns early without speaking.
 */
export function speakKannada(
  text: string,
  options?: SpeakKannadaOptions
): void {
  if (typeof window === 'undefined') return;

  const candidate = (options?.script || text || '').trim();
  if (!candidate) return;

  // Enforce: speak() receives Kannada script only — never romanized text
  const scriptToSpeak = KANNADA_SCRIPT_REGEX.test(candidate)
    ? candidate
    : getKannadaScriptForText(candidate);

  if (!scriptToSpeak || !KANNADA_SCRIPT_REGEX.test(scriptToSpeak)) {
    console.warn(
      `[Kanglish TTS] Missing Kannada script for item "${
        options?.itemId || text
      }". Refusing to speak romanized text.`
    );
    options?.onEnd?.();
    return;
  }

  if (speakingSafetyTimer) {
    clearTimeout(speakingSafetyTimer);
    speakingSafetyTimer = null;
  }

  void speakScript(scriptToSpeak, {
    itemId: options?.itemId || text,
    slow: options?.slow,
    character: options?.character,
    onUnsupported: options?.onUnsupported,
    onStart: () => {
      notifyListeners(scriptToSpeak);
      options?.onStart?.();
    },
    onEnd: () => {
      if (speakingSafetyTimer) {
        clearTimeout(speakingSafetyTimer);
        speakingSafetyTimer = null;
      }
      notifyListeners(null);
      options?.onEnd?.();
    },
  });
}

/**
 * Cancels any active TTS utterance immediately when advancing between exercises.
 */
export function cancelKannadaSpeech(): void {
  if (typeof window === 'undefined') return;
  try {
    if (speakingSafetyTimer) {
      clearTimeout(speakingSafetyTimer);
      speakingSafetyTimer = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  } catch {
    // Ignore cancel errors
  } finally {
    notifyListeners(null);
  }
}

/**
 * Normalizes a string for speech comparison:
 * lowercases, strips accents/diacritics, and removes punctuation.
 */
export function normalizeForScoring(raw: string): string {
  return normalizeLatin(raw);
}

/**
 * Phonetic normalization for Kanglish romanization variations
 * (e.g., "thagolli" vs "tagoli", "namaskara" vs "namaskarra", "houdu" vs "haudu", "ondu" vs "1").
 */
function normalizePhoneticTranslit(raw: string): string {
  const base = normalizeForScoring(raw);
  if (!base) return '';
  const digitMap: Record<string, string> = {
    '1': 'ondu',
    '2': 'eradu',
    '3': 'muru',
    '4': 'nalku',
    '5': 'aidu',
    '6': 'aru',
    '7': 'elu',
    '8': 'entu',
    '9': 'ombattu',
    '10': 'hattu',
  };
  return base
    .split(' ')
    .map((w) => digitMap[w] || w)
    .join(' ')
    .replace(/th/g, 't')
    .replace(/dh/g, 'd')
    .replace(/bh/g, 'b')
    .replace(/kh/g, 'k')
    .replace(/gh/g, 'g')
    .replace(/chh/g, 'ch')
    .replace(/sh/g, 's')
    .replace(/aa/g, 'a')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/ou/g, 'au')
    .replace(/([a-z])\1+/g, '$1');
}

function normalizeKannadaScript(raw: string): string {
  return normalize(raw);
}

function normalizePhoneticKannada(raw: string): string {
  return normalizeKannadaScript(raw)
    .replace(/ಾ/g, '')
    .replace(/ೀ/g, 'ಿ')
    .replace(/ೂ/g, 'ು')
    .replace(/ೇ/g, 'ೆ')
    .replace(/ೋ/g, 'ೊ')
    .replace(/ಳ್ಳ/g, 'ಳ')
    .replace(/ಲ್ಲ/g, 'ಲ')
    .replace(/ತ್ತ/g, 'ತ')
    .replace(/ದ್ದ/g, 'ದ')
    .replace(/ನ್ನ/g, 'ನ')
    .replace(/ಮ್ಮ/g, 'ಮ');
}

/**
 * Shared Levenshtein similarity for minor transliteration spelling tolerance
 */
function wordSimilarity(a: string, b: string): number {
  return sharedSimilarity(a, b);
}

export interface SpeechScoreResult {
  passed: boolean;
  similarity: number;
  bestTranscript: string;
}

export function scoreSpeechAttempt(
  transcripts: string[],
  targetTranslit: string,
  targetKannada: string
): SpeechScoreResult {
  const candidates = transcripts.filter((t) => t && t.trim().length > 0);
  if (candidates.length === 0) {
    console.info('[speak]', {
      transcript: '',
      similarity: (0).toFixed(2),
      verdict: 'RETRY',
    });
    return { passed: false, similarity: 0, bestTranscript: '' };
  }

  const normTargetTranslit = normalizeForScoring(targetTranslit);
  const phonTargetTranslit = normalizePhoneticTranslit(targetTranslit);
  const normTargetKannada = normalizeKannadaScript(targetKannada);
  const phonTargetKannada = normalizePhoneticKannada(targetKannada);

  const translitWords = normTargetTranslit.split(' ').filter(Boolean);
  const phonTranslitWords = phonTargetTranslit.split(' ').filter(Boolean);
  const kannadaWords = normTargetKannada.split(' ').filter(Boolean);
  const phonKannadaWords = phonTargetKannada.split(' ').filter(Boolean);

  let bestScore = 0;
  let bestTranscript = candidates[0].trim();

  for (const rawCandidate of candidates) {
    const normCandTranslit = normalizeForScoring(rawCandidate);
    const phonCandTranslit = normalizePhoneticTranslit(rawCandidate);
    const normCandKannada = normalizeKannadaScript(rawCandidate);
    const phonCandKannada = normalizePhoneticKannada(rawCandidate);

    if (
      (normTargetKannada && normCandKannada === normTargetKannada) ||
      (phonTargetKannada && phonCandKannada === phonTargetKannada) ||
      (normTargetTranslit && normCandTranslit === normTargetTranslit) ||
      (phonTargetTranslit && phonCandTranslit === phonTargetTranslit)
    ) {
      bestScore = 1.0;
      bestTranscript = rawCandidate.trim();
      break;
    }

    const candTranslitWords = normCandTranslit.split(' ').filter(Boolean);
    const candPhonTranslitWords = phonCandTranslit.split(' ').filter(Boolean);
    let translitMatched = 0;
    if (translitWords.length > 0) {
      for (let idx = 0; idx < translitWords.length; idx++) {
        const tWord = translitWords[idx];
        const pWord = phonTranslitWords[idx] || tWord;
        const hit =
          candTranslitWords.some(
            (cWord) =>
              cWord === tWord ||
              cWord.includes(tWord) ||
              tWord.includes(cWord) ||
              wordSimilarity(cWord, tWord) >= 0.7
          ) ||
          candPhonTranslitWords.some(
            (cpWord) =>
              cpWord === pWord || wordSimilarity(cpWord, pWord) >= 0.7
          );
        if (hit) translitMatched++;
      }
    }
    const translitRatio =
      translitWords.length > 0 ? translitMatched / translitWords.length : 0;

    const fullTranslitSim = Math.max(
      wordSimilarity(normCandTranslit, normTargetTranslit),
      wordSimilarity(phonCandTranslit, phonTargetTranslit)
    );

    const candKannadaWords = normCandKannada.split(' ').filter(Boolean);
    const candPhonKannadaWords = phonCandKannada.split(' ').filter(Boolean);
    let kannadaMatched = 0;
    if (kannadaWords.length > 0) {
      for (let idx = 0; idx < kannadaWords.length; idx++) {
        const kWord = kannadaWords[idx];
        const pkWord = phonKannadaWords[idx] || kWord;
        const hit =
          candKannadaWords.some(
            (cWord) =>
              cWord === kWord ||
              cWord.includes(kWord) ||
              kWord.includes(cWord) ||
              wordSimilarity(cWord, kWord) >= 0.68
          ) ||
          candPhonKannadaWords.some(
            (cpkWord) =>
              cpkWord === pkWord ||
              cpkWord.includes(pkWord) ||
              pkWord.includes(cpkWord) ||
              wordSimilarity(cpkWord, pkWord) >= 0.68
          );
        if (hit) kannadaMatched++;
      }
    }
    const kannadaRatio =
      kannadaWords.length > 0 ? kannadaMatched / kannadaWords.length : 0;

    const fullKannadaSim = Math.max(
      wordSimilarity(normCandKannada, normTargetKannada),
      wordSimilarity(phonCandKannada, phonTargetKannada)
    );

    const candidateSimilarity = Math.max(
      translitRatio,
      fullTranslitSim,
      kannadaRatio,
      fullKannadaSim
    );
    if (candidateSimilarity >= bestScore) {
      bestScore = candidateSimilarity;
      bestTranscript = rawCandidate.trim();
    }
  }

  const score = Math.round(bestScore * 100) / 100;
  const passed = score >= 0.7;

  console.info('[speak]', {
    transcript: bestTranscript,
    similarity: score.toFixed(2),
    verdict: passed ? 'PASS' : 'RETRY',
  });

  return {
    passed,
    similarity: score,
    bestTranscript,
  };
}

export function isSpeechRecognitionSupported(): boolean {
  return Boolean(getSpeechRecognitionConstructor());
}

export interface StartRecognitionCallbacks {
  onStateChange?: (state: MicButtonState) => void;
  onSupportStateChange?: (supportState: SpeechSupportState) => void;
  onInterimResult?: (interimTranscript: string) => void;
  onResult: (transcripts: string[]) => void;
  onNoSpeech?: () => void;
  onNetworkError?: () => void;
  onAborted?: () => void;
  onEnd?: () => void;
}

let activeRecognitionInstance: any = null;

export function abortActiveRecognition(): void {
  if (activeRecognitionInstance) {
    try {
      activeRecognitionInstance.abort?.();
    } catch {
      // Ignore abort errors
    }
    activeRecognitionInstance = null;
  }
}

export function startKannadaSpeechRecognition(
  callbacks: StartRecognitionCallbacks
): { stop: () => void; abort: () => void } | null {
  const SpeechRec = getSpeechRecognitionConstructor();
  if (!SpeechRec) {
    const fallbackState: SpeechSupportState = isRunningInIframe()
      ? 'iframe'
      : 'unsupported';
    detectSpeechSupport();
    callbacks.onSupportStateChange?.(fallbackState);
    callbacks.onStateChange?.('idle');
    return null;
  }

  detectSpeechSupport();
  abortActiveRecognition();

  let settled = false;
  let latestInterim = '';

  callbacks.onStateChange?.('requesting-permission');

  const recognition = new SpeechRec();
  activeRecognitionInstance = recognition;

  recognition.lang = 'kn-IN';
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 3;

  recognition.onstart = () => {
    if (!settled) {
      callbacks.onStateChange?.('listening');
    }
  };

  recognition.onresult = (event: any) => {
    if (settled) return;

    let interimText = '';
    const finalAlternatives: string[] = [];
    let hasFinal = false;

    if (event?.results) {
      for (let i = 0; i < event.results.length; i++) {
        const res = event.results[i];
        if (!res) continue;
        if (res.isFinal) {
          hasFinal = true;
          for (let j = 0; j < res.length; j++) {
            const t = res[j]?.transcript;
            if (t && String(t).trim()) {
              finalAlternatives.push(String(t).trim());
            }
          }
        } else {
          const t = res[0]?.transcript;
          if (t) {
            interimText += (interimText ? ' ' : '') + String(t).trim();
          }
        }
      }
    }

    if (interimText && !hasFinal) {
      latestInterim = interimText;
      callbacks.onInterimResult?.(interimText);
    }

    if (hasFinal && finalAlternatives.length > 0) {
      settled = true;
      activeRecognitionInstance = null;
      try {
        recognition.stop();
      } catch {
        // Ignore stop errors
      }
      callbacks.onStateChange?.('processing');
      callbacks.onResult(finalAlternatives);
    }
  };

  recognition.onerror = (event: any) => {
    if (settled) return;
    settled = true;
    activeRecognitionInstance = null;

    const errCode = String(event?.error || '').toLowerCase();

    if (errCode === 'not-allowed' || errCode === 'service-not-allowed') {
      const nextSupport: SpeechSupportState = isRunningInIframe()
        ? 'iframe'
        : 'denied';
      callbacks.onSupportStateChange?.(nextSupport);
      callbacks.onStateChange?.('idle');
    } else if (errCode === 'no-speech') {
      callbacks.onStateChange?.('idle');
      callbacks.onNoSpeech?.();
    } else if (errCode === 'network') {
      callbacks.onStateChange?.('idle');
      callbacks.onNetworkError?.();
    } else if (errCode === 'aborted') {
      callbacks.onStateChange?.('idle');
      callbacks.onAborted?.();
    } else {
      console.warn('[kanglish-speech] recognition error:', event?.error, event);
      callbacks.onStateChange?.('idle');
      callbacks.onNoSpeech?.();
    }
  };

  recognition.onend = () => {
    if (activeRecognitionInstance === recognition) {
      activeRecognitionInstance = null;
    }
    if (!settled) {
      settled = true;
      if (latestInterim.trim().length > 0) {
        callbacks.onStateChange?.('processing');
        callbacks.onResult([latestInterim.trim()]);
      } else {
        callbacks.onStateChange?.('idle');
        callbacks.onNoSpeech?.();
      }
    }
    callbacks.onEnd?.();
  };

  const safeStart = () => {
    try {
      recognition.start();
    } catch (err: any) {
      const isInvalidState =
        err?.name === 'InvalidStateError' ||
        String(err?.message || '').toLowerCase().includes('already started');

      if (isInvalidState) {
        try {
          recognition.stop();
        } catch {
          // ignore stop error
        }
        setTimeout(() => {
          if (settled) return;
          try {
            recognition.start();
          } catch (retryErr) {
            if (!settled) {
              settled = true;
              console.warn('[kanglish-speech] retry start error:', retryErr);
              callbacks.onStateChange?.('idle');
              callbacks.onNoSpeech?.();
            }
          }
        }, 100);
      } else {
        if (!settled) {
          settled = true;
          console.warn('[kanglish-speech] start error:', err);
          callbacks.onStateChange?.('idle');
          callbacks.onNoSpeech?.();
        }
      }
    }
  };

  safeStart();

  return {
    stop: () => {
      try {
        recognition.stop();
      } catch {
        // Ignore stop errors
      }
    },
    abort: () => {
      settled = true;
      if (activeRecognitionInstance === recognition) {
        activeRecognitionInstance = null;
      }
      try {
        recognition.abort();
      } catch {
        // Ignore abort errors
      }
      callbacks.onStateChange?.('idle');
    },
  };
}
