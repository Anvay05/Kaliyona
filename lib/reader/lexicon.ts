import {
  normalize,
  normalizeLatin,
  similarity,
} from '@/lib/shared/matcher';

export interface OcrWord {
  text: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

export type LexiconEntry = {
  kn: string;             // exact surface form, e.g. "ಬೆಣ್ಣೆ"
  translit: string;       // "benne"
  en: string;             // "Butter"
  category: 'food' | 'travel' | 'sign' | 'number' | 'common';
  variants?: string[];    // OCR-confusable spellings/segmentations
};

export interface LexiconMatchResult {
  word: string;
  entry: LexiconEntry;
  score: number;
}

export interface LineMatchedOcrItem {
  rawText: string;
  cleanText: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  entry: LexiconEntry | null;
  score: number;
}

const KANNADA_SCRIPT_REGEX = /[\u0C80-\u0CFF]/;
const KANNADA_NUMERAL_ONLY_REGEX = /^[\u0CE6-\u0CEF]+$/;

/**
 * FIX 2b — Stopwords set: common 1-3 char English fragments, abbreviations,
 * price/unit prefixes, and generic English words that cause false-positive OCR matches.
 */
export const STOPWORDS = new Set<string>([
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  'pc', 'pcs', 'rs', 'no', 'nos', 'mr', 'ms', 'mrs', 'dr', 'st', 'rd',
  'in', 'on', 'at', 'to', 'of', 'or', 'by', 'id', 'am', 'pm', 'as',
  'is', 'it', 'be', 'an', 'we', 'he', 'me', 'my', 'so', 'up', 'if',
  'do', 'go', 'us', 'tv', 'ac', 'dc', 'pg', 'km', 'kg', 'gm', 'ml',
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can',
  'had', 'her', 'was', 'one', 'two', 'three', 'our', 'out', 'day', 'get',
  'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'way',
  'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use',
  'per', 'qty', 'inr', 'gst', 'tax', 'net', 'min', 'max', 'ltd', 'pvt',
  'inc', 'co', 'sr', 'jr', 'ph', 'tel', 'mob',
  // Generic English words that must never trigger English OCR false positives (FIX 2a)
  'here', 'there', 'today', 'tomorrow', 'open', 'free', 'only', 'what',
  'when', 'where', 'this', 'that', 'with', 'from', 'have', 'will', 'your',
]);

/**
 * Generic English transliterations or words that should NEVER be matched via Latin OCR
 * (only via Kannada script).
 */
const BLOCKED_ENGLISH_TRANSLIT = new Set<string>([
  'here', 'there', 'today', 'tomorrow', 'one', 'two', 'three', 'four', 'five',
  'open', 'free', 'only', 'indu', 'naale', 'illi', 'alli', 'ondu', 'eradu',
  'muru', 'nalku', 'aidu', 'aaru', 'elu', 'entu', 'ombattu', 'hattu',
]);

/**
 *Exact-only Kannada number tokens (FIX 2c: no fuzzy matching on numerals or digit words).
 */
const EXACT_ONLY_NUMBER_TOKENS = new Set<string>([
  '೦', '೧', '೨', '೩', '೪', '೫', '೬', '೭', '೮', '೯',
  '೧೦', '೨೦', '೩೦', '೪೦', '೫೦', '೬೦', '೭೦', '೮೦', '೯೦', '೧೦೦',
  'ಒಂದು', 'ಎರಡು', 'ಮೂರು', 'ನಾಲ್ಕು', 'ಐದು', 'ಆರು', 'ಏಳು', 'ಎಂಟು', 'ಒಂಬತ್ತು', 'ಹತ್ತು',
]);

export const LEXICON: LexiconEntry[] = [
  // =========================================================================
  // 1. DARSHINI & SOUTH INDIAN FOOD (Multi-word + Single-word + OCR Variants)
  // =========================================================================
  {
    kn: 'ಚೌಚೌ ಬಾತ್',
    translit: 'chow chow bath',
    en: 'Chow Chow Bath',
    category: 'food',
    variants: [
      'ಚೌಚೌಬಾತ್',
      'ಚೌ ಚೌ ಬಾತ್',
      'ಚೌಚೌ ಬಾತ',
      'ಚೌಚೌಬಾತ',
      'ಚೌ ಚೌ ಬಾತ',
      'ಚೌಚೌ ಭಾತ್',
      'ಚೌಚೌಭಾತ್',
      'ಚಾಚಾ ಬಾತ್',
      'ಚೊಚೊ ಬಾತ್',
      'ಚೌಚಾ ಬಾತ್',
    ],
  },
  {
    kn: 'ಖಾರಾಬಾತ್',
    translit: 'khara bath',
    en: 'Khara Bath',
    category: 'food',
    variants: [
      'ಖಾರಾ ಬಾತ್',
      'ಖಾರ ಬಾತ್',
      'ಖಾರಬಾತ್',
      'ಖಾರಾಬಾತ',
      'ಖಾರಬಾತ',
      'ಖಾರಾ ಬಾತ',
      'ಖಾರ ಬಾತ',
      'ಕಾರಾಬಾತ್',
      'ಕಾರಬಾತ್',
      'ಕಾರಾ ಬಾತ್',
      'ಖಾರಾಭಾತ್',
      'ಖಾರಭಾತ್',
      'ಖಾರಾ ಭಾತ್',
    ],
  },
  {
    kn: 'ಕೇಸರಿಬಾತ್',
    translit: 'kesari bath',
    en: 'Kesari Bath',
    category: 'food',
    variants: [
      'ಕೇಸರಿ ಬಾತ್',
      'ಕೆಸರಿ ಬಾತ್',
      'ಕೆಸರಿಬಾತ್',
      'ಕೇಸರಿಬಾತ',
      'ಕೆಸರಿಬಾತ',
      'ಕೇಸರಿ ಬಾತ',
      'ಕೆಸರಿ ಬಾತ',
      'ಕೇಸರೀ ಬಾತ್',
      'ಕೇಸರೀಬಾತ್',
      'ಕೇಶರಿ ಬಾತ್',
      'ಕೇಶರಿಬಾತ್',
      'ಕೇಸರಿ ಭಾತ್',
      'ಕೇಸರಿಭಾತ್',
    ],
  },
  {
    kn: 'ಚಿತ್ರಾನ್ನ',
    translit: 'chitranna',
    en: 'Chitranna (Lemon Rice)',
    category: 'food',
    variants: [
      'ಚಿತ್ರನ್ನ',
      'ಚಿತ್ತಾನ್ನ',
      'ಚಿತ್ರಾನ',
      'ಚಿತ್ರನ್ನಾ',
      'ಚಿತ್ರಾಣ್ಣ',
      'ಚಿತ್ರಾನ್',
      'ಚಿತ್ರಾನ್ನಾ',
      'ಚೆತ್ರಾನ್ನ',
      'ಛಿತ್ರಾನ್ನ',
      'ಚಿತ್ರಾನ್ಮ',
      'ಚಿತ್ರ ಅನ್ನ',
      'ಚಿತ್ರಾ ನ್ನ',
      'ನಿಂಬೆ ಚಿತ್ರಾನ್ನ',
    ],
  },
  {
    kn: 'ಪುಳಿಯೋಗರೆ',
    translit: 'puliyogare',
    en: 'Puliyogare (Tamarind Rice)',
    category: 'food',
    variants: [
      'ಪುಳಿಯೊಗರೆ',
      'ಪುಲಿಯೋಗರೆ',
      'ಪುಲಿಯೊಗರೆ',
      'ಪುಳಿಯೋಗರ',
      'ಪುಳಿಯೋಗರೇ',
      'ಪುಳಿಯೋಗರಿ',
      'ಪೊಳಿಯೋಗರೆ',
      'ಪುಳಿಯಾಗರೆ',
      'ಮಳಿಯೋಗರೆ',
      'ಪುಳಿಯೋಗದೆ',
      'ಪುಳಿ ಯೋಗರೆ',
      'ಪುಳಿಯೋ ಗರೆ',
      'ಪುಳಿಯೊಗರ',
    ],
  },
  {
    kn: 'ರೈಸ್ ಬಾತ್',
    translit: 'rice bath',
    en: 'Rice Bath (Spiced Rice)',
    category: 'food',
    variants: [
      'ರೈಸ್‌ಬಾತ್',
      'ರೈಸ್ಬಾತ್',
      'ರೈಸ್ ಬಾತ',
      'ರೈಸ್ ಭಾತ್',
      'ರೈಸ ಬಾತ್',
      'ರೈಸ್‌ ಬಾತ್',
      'ರೈಸ್ ಬಾತು',
    ],
  },
  {
    kn: 'ಬಿಸಿಬೇಳೆಬಾತ್',
    translit: 'bisi bele bath',
    en: 'Bisi Bele Bath',
    category: 'food',
    variants: [
      'ಬಿಸಿಬೇಳೆ ಬಾತ್',
      'ಬಿಸಿ ಬೇಳೆ ಬಾತ್',
      'ಬಿಸಿಬೇಳೆ ಬಾತ',
      'ಬಿಸಿಬೇಳೆಬಾತ',
      'ಬಿಸಿ ಬೇಳೆ ಬಾತ',
      'ಬಿಸಿಬೇಲೆಬಾತ್',
      'ಬಿಸಿ ಬೇಲೆ ಬಾತ್',
      'ಬಿಸಿಬೇಳೆ',
    ],
  },
  {
    kn: 'ವಾಂಗಿ ಬಾತ್',
    translit: 'vangi bath',
    en: 'Vangi Bath (Brinjal Rice)',
    category: 'food',
    variants: ['ವಾಂಗಿಬಾತ್', 'ವಂಗಿ ಬಾತ್', 'ವಾಂಗಿ ಬಾತ', 'ವಾಂಗಿಭಾತ್'],
  },
  {
    kn: 'ಟೊಮೆಟೊ ಬಾತ್',
    translit: 'tomato bath',
    en: 'Tomato Bath',
    category: 'food',
    variants: ['ಟೊಮೆಟೊಬಾತ್', 'ಟೊಮೇಟೊ ಬಾತ್', 'ಟೊಮಾಟೊ ಬಾತ್', 'ಟೊಮೆಟೊ ಬಾತ'],
  },
  {
    kn: 'ಶಾವಿಗೆ ಬಾತ್',
    translit: 'shavige bath',
    en: 'Shavige Bath (Vermicelli)',
    category: 'food',
    variants: ['ಶಾವಿಗೆಬಾತ್', 'ಶಾವಿಗೆ ಬಾತ', 'ಸೇವಿಗೆ ಬಾತ್'],
  },
  {
    kn: 'ಮಸಾಲೆ ದೋಸೆ',
    translit: 'masala dosa',
    en: 'Masala Dosa',
    category: 'food',
    variants: [
      'ಮಸಾಲೆದೋಸೆ',
      'ಮಸಾಲ ದೋಸೆ',
      'ಮಸಾಲದೋಸೆ',
      'ಮಸಾಲೆ ದೊಸೆ',
      'ಮಸಾಲಾ ದೋಸೆ',
      'ಮಸಾಲಾದೋಸೆ',
      'ಮಸಾಲೆ ದೋಸ',
      'ಮಸಾಲ ದೋಸ',
    ],
  },
  {
    kn: 'ಬೆಣ್ಣೆ ದೋಸೆ',
    translit: 'benne dose',
    en: 'Butter Dosa',
    category: 'food',
    variants: [
      'ಬೆಣ್ಣೆದೋಸೆ',
      'ಬೆನ್ನೆ ದೋಸೆ',
      'ಬೆನ್ನೆದೋಸೆ',
      'ಬೆಣ್ಣೆ ದೊಸೆ',
      'ಬೆಣೆ ದೋಸೆ',
      'ಬೆಣ್ಣೆ ದೋಸ',
    ],
  },
  {
    kn: 'ಬಟರ್ ದೋಸೆ',
    translit: 'butter dosa',
    en: 'Butter Dosa',
    category: 'food',
    variants: [
      'ಬಟರ್ದೋಸೆ',
      'ಬಟರ್‌ ದೋಸೆ',
      'ಬಟರ ದೋಸೆ',
      'ಬಟರ್ ದೊಸೆ',
      'ಬಟರ್ ದೋಸ',
    ],
  },
  {
    kn: 'ಬೆಣ್ಣೆ ಮಸಾಲೆ ದೋಸೆ',
    translit: 'benne masale dose',
    en: 'Butter Masala Dosa',
    category: 'food',
    variants: [
      'ಬೆಣ್ಣೆಮಸಾಲೆದೋಸೆ',
      'ಬೆನ್ನೆ ಮಸಾಲೆ ದೋಸೆ',
      'ಬೆಣ್ಣೆ ಮಸಾಲ ದೋಸೆ',
      'ಬಟರ್ ಮಸಾಲೆ ದೋಸೆ',
    ],
  },
  {
    kn: 'ಸೆಟ್ ದೋಸೆ',
    translit: 'set dosa',
    en: 'Set Dosa',
    category: 'food',
    variants: [
      'ಸೇಟ್ ದೋಸೆ',
      'ಸೆಟ್ದೋಸೆ',
      'ಸೇಟ್ದೋಸೆ',
      'ಸೆಟ್‌ದೋಸೆ',
      'ಸೆಟ್ ದೊಸೆ',
      'ಸಟ್ ದೋಸೆ',
      'ಸೆಟ್ ದೋಸ',
      'ಸೇಟ್ ದೊಸೆ',
    ],
  },
  {
    kn: 'ಖಾಲಿ ದೋಸೆ',
    translit: 'khali dose',
    en: 'Plain Dosa (Khali Dosa)',
    category: 'food',
    variants: [
      'ಖಾಲಿದೋಸೆ',
      'ಖಾಲಿ ದೊಸೆ',
      'ಖಾಲಿ ದೋಸ',
      'ಸಾದಾ ದೋಸೆ',
      'ಸಾದಾದೋಸೆ',
      'ಪ್ಲೇನ್ ದೋಸೆ',
    ],
  },
  {
    kn: 'ರವೆ ದೋಸೆ',
    translit: 'rava dosa',
    en: 'Rava Dosa',
    category: 'food',
    variants: ['ರವೆದೋಸೆ', 'ರವಾ ದೋಸೆ', 'ರವಾದೋಸೆ', 'ರವೆ ದೊಸೆ', 'ರವೆ ದೋಸ'],
  },
  {
    kn: 'ಈರುಳ್ಳಿ ದೋಸೆ',
    translit: 'eerulli dose',
    en: 'Onion Dosa',
    category: 'food',
    variants: ['ಈರುಳ್ಳಿದೋಸೆ', 'ಈರುಳಿ ದೋಸೆ', 'ಈರುಳ್ಳಿ ದೊಸೆ', 'ಆನಿಯನ್ ದೋಸೆ'],
  },
  {
    kn: 'ಪೇಪರ್ ದೋಸೆ',
    translit: 'paper dosa',
    en: 'Paper Dosa',
    category: 'food',
    variants: ['ಪೇಪರ್ದೋಸೆ', 'ಪೇಪರ್‌ದೋಸೆ', 'ಪೇಪರ ದೋಸೆ', 'ಪೇಪರ್ ಮಸಾಲೆ ದೋಸೆ'],
  },
  {
    kn: 'ಮೈಸೂರು ಮಸಾಲೆ ದೋಸೆ',
    translit: 'mysore masala dosa',
    en: 'Mysore Masala Dosa',
    category: 'food',
    variants: ['ಮೈಸೂರುಮಸಾಲೆದೋಸೆ', 'ಮೈಸೂರ್ ಮಸಾಲೆ ದೋಸೆ', 'ಮೈಸೂರು ಮಸಾಲ ದೋಸೆ'],
  },
  {
    kn: 'ರಾಗಿ ದೋಸೆ',
    translit: 'ragi dosa',
    en: 'Ragi Dosa',
    category: 'food',
    variants: ['ರಾಗಿದೋಸೆ', 'ರಾಗಿ ದೊಸೆ'],
  },
  {
    kn: 'ನೀರ್ ದೋಸೆ',
    translit: 'neer dosa',
    en: 'Neer Dosa',
    category: 'food',
    variants: ['ನೀರ್ದೋಸೆ', 'ನೀರು ದೋಸೆ', 'ನೀರುದೋಸೆ', 'ನೀರ್ ದೊಸೆ'],
  },
  {
    kn: 'ಮೆಂತ್ಯ ದೋಸೆ',
    translit: 'menthya dose',
    en: 'Methi Dosa',
    category: 'food',
    variants: ['ಮೆಂತ್ಯದೋಸೆ', 'ಮೆಂತೆ ದೋಸೆ', 'ಮೆಂತ್ಯ ದೊಸೆ'],
  },
  {
    kn: 'ತುಪ್ಪ ದೋಸೆ',
    translit: 'tuppa dose',
    en: 'Ghee Roast Dosa',
    category: 'food',
    variants: ['ತುಪ್ಪದ ದೋಸೆ', 'ತುಪ್ಪ ರೋಸ್ಟ್', 'ಘೀ ರೋಸ್ಟ್'],
  },
  {
    kn: 'ತಟ್ಟೆ ಇಡ್ಲಿ',
    translit: 'thatte idli',
    en: 'Thatte Idli (Plate Idli)',
    category: 'food',
    variants: ['ತಟ್ಟೆಇಡ್ಲಿ', 'ತಟ್ಟೇ ಇಡ್ಲಿ', 'ತಟ್ಟೆ ಇಡಲಿ', 'ತಟ್ಟೆ ಇಡ್ಲೀ'],
  },
  {
    kn: 'ರವೆ ಇಡ್ಲಿ',
    translit: 'rava idli',
    en: 'Rava Idli',
    category: 'food',
    variants: ['ರವೆಇಡ್ಲಿ', 'ರವಾ ಇಡ್ಲಿ', 'ರವಾಇಡ್ಲಿ', 'ರವೆ ಇಡಲಿ', 'ರವಾ ಇಡಲಿ'],
  },
  {
    kn: 'ಮಲ್ಲಿಗೆ ಇಡ್ಲಿ',
    translit: 'mallige idli',
    en: 'Mallige Soft Idli',
    category: 'food',
    variants: ['ಮಲ್ಲಿಗೆಇಡ್ಲಿ'],
  },
  {
    kn: 'ಮಿನಿ ಇಡ್ಲಿ',
    translit: 'mini idli',
    en: 'Mini Sambar Idli',
    category: 'food',
    variants: ['ಮಿನಿಇಡ್ಲಿ', 'ಬಟನ್ ಇಡ್ಲಿ'],
  },
  {
    kn: 'ಇಡ್ಲಿ ವಡೆ',
    translit: 'idli vada',
    en: 'Idli Vada',
    category: 'food',
    variants: ['ಇಡ್ಲಿವಡೆ', 'ಇಡಲಿ ವಡೆ', 'ಇಡ್ಲಿ ವಡಾ', 'ಇಡ್ಲಿ ವಡ'],
  },
  {
    kn: 'ಉದ್ದಿನ ವಡೆ',
    translit: 'uddina vade',
    en: 'Uddina Vada',
    category: 'food',
    variants: ['ಉದ್ದಿನವಡೆ', 'ಉದ್ದಿನ ವಡ', 'ಉದ್ದಿನ ವಡಾ', 'ಉದ್ದು ವಡೆ'],
  },
  {
    kn: 'ಮದ್ದೂರು ವಡೆ',
    translit: 'maddur vada',
    en: 'Maddur Vada',
    category: 'food',
    variants: ['ಮದ್ದೂರುವಡೆ', 'ಮದ್ದೂರ್ ವಡೆ', 'ಮದ್ದೂರ ವಡೆ', 'ಮದ್ದೂರು ವಡ'],
  },
  {
    kn: 'ಮೊಸರು ವಡೆ',
    translit: 'mosaru vade',
    en: 'Curd Vada (Mosaru Vade)',
    category: 'food',
    variants: ['ಮೊಸರುವಡೆ', 'ದಹಿ ವಡೆ', 'ಮೊಸರು ವಡ'],
  },
  {
    kn: 'ಮಸಾಲೆ ವಡೆ',
    translit: 'masala vada',
    en: 'Masala Vada (ambode)',
    category: 'food',
    variants: ['ಮಸಾಲೆವಡೆ', 'ಆಂಬೊಡೆ', 'ಅಂಬೊಡೆ'],
  },
  {
    kn: 'ಪೂರಿ ಸಾಗು',
    translit: 'poori saagu',
    en: 'Poori Saagu',
    category: 'food',
    variants: ['ಪೂರಿಸಾಗು', 'ಪುರಿ ಸಾಗು', 'ಪೂರಿಸಾಗೂ', 'ಪೂರಿ ಸಾಗೂ', 'ಪೂರಿ ಪಲ್ಯ'],
  },
  {
    kn: 'ಮೊಸರನ್ನ',
    translit: 'mosaranna',
    en: 'Curd Rice (Mosaranna)',
    category: 'food',
    variants: ['ಮೊಸರು ಅನ್ನ', 'ಮೊಸರುಅನ್ನ', 'ಮೊಸರನ್ನಾ', 'ಮೊಸರನ'],
  },
  {
    kn: 'ಅನ್ನ ಸಾಂಬಾರ್',
    translit: 'anna sambar',
    en: 'Rice & Sambar',
    category: 'food',
    variants: ['ಅನ್ನಸಾಂಬಾರ್', 'ಅನ್ನ ಸಾಂಬಾರು', 'ಅನ್ನ ಸಾರು'],
  },
  {
    kn: 'ರಾಗಿ ಮುದ್ದೆ',
    translit: 'ragi mudde',
    en: 'Ragi Mudde',
    category: 'food',
    variants: ['ರಾಗಿಮುದ್ದೆ', 'ಮುದ್ದೆ ಊಟ', 'ಮುದ್ದೆ ಸಾಂಬಾರ್'],
  },
  {
    kn: 'ಬೋಂಡಾ ಸೂಪ್',
    translit: 'bonda soup',
    en: 'Bonda Soup',
    category: 'food',
    variants: ['ಬೋಂಡಾಸೂಪ್', 'ಬೊಂಡಾ ಸೂಪ್', 'ಬೊಂಡಾಸೂಪ್'],
  },
  {
    kn: 'ಮಂಗಳೂರು ಬನ್ಸ್',
    translit: 'mangalore buns',
    en: 'Mangalore Buns',
    category: 'food',
    variants: ['ಮಂಗಳೂರುಬನ್ಸ್', 'ಮಂಗಳೂರ ಬನ್ಸ್', 'ಮಂಗಳೂರು ಬನ್ಸ'],
  },
  {
    kn: 'ಗೋಳಿಬಜೆ',
    translit: 'golibaje',
    en: 'Mangalore Bajji (Golibaje)',
    category: 'food',
    variants: ['ಗೋಳಿ ಬಜೆ', 'ಮಂಗಳೂರು ಬಜ್ಜಿ'],
  },
  {
    kn: 'ಅಕ್ಕಿ ರೊಟ್ಟಿ',
    translit: 'akki rotti',
    en: 'Akki Rotti (Rice Flatbread)',
    category: 'food',
    variants: ['ಅಕ್ಕಿರೊಟ್ಟಿ', 'ಅಕ್ಕಿ ರೊಟ್ಟೀ'],
  },
  {
    kn: 'ರಾಗಿ ರೊಟ್ಟಿ',
    translit: 'ragi rotti',
    en: 'Ragi Rotti',
    category: 'food',
    variants: ['ರಾಗಿರೊಟ್ಟಿ', 'ರಾಗಿ ರೊಟ್ಟೀ'],
  },
  {
    kn: 'ಜೋಳದ ರೊಟ್ಟಿ',
    translit: 'jolada rotti',
    en: 'Jowar Rotti',
    category: 'food',
    variants: ['ಜೋಳದರೊಟ್ಟಿ', 'ಜೋಳ ರೊಟ್ಟಿ'],
  },
  {
    kn: 'ಮೆಣಸಿನಕಾಯಿ ಬಜ್ಜಿ',
    translit: 'menasinakayi bajji',
    en: 'Mirchi Bajji',
    category: 'food',
    variants: ['ಮಿರ್ಚಿ ಬಜ್ಜಿ', 'ಮೆಣಸಿನ ಬಜ್ಜಿ'],
  },
  {
    kn: 'ಬಾಳೆಕಾಯಿ ಬಜ್ಜಿ',
    translit: 'balekayi bajji',
    en: 'Raw Banana Bajji',
    category: 'food',
    variants: ['ಬಾಳೆಕಾಯಿಬಜ್ಜಿ'],
  },
  {
    kn: 'ಆಲೂಗಡ್ಡೆ ಬೋಂಡಾ',
    translit: 'aalugadde bonda',
    en: 'Aloo Bonda',
    category: 'food',
    variants: ['ಆಲೂ ಬೋಂಡಾ', 'ಆಲೂಬೋಂಡಾ'],
  },
  {
    kn: 'ಫಿಲ್ಟರ್ ಕಾಫಿ',
    translit: 'filter coffee',
    en: 'Filter Coffee',
    category: 'food',
    variants: ['ಫಿಲ್ಟರ್ಕಾಫಿ', 'ಫಿಲ್ಟರ್‌ ಕಾಫಿ', 'ಫಿಲ್ಟರ ಕಾಫಿ', 'ಫಿಲ್ಟರ್ ಕಾಪಿ'],
  },
  {
    kn: 'ಬಾದಾಮಿ ಹಾಲು',
    translit: 'badam milk',
    en: 'Badam Milk',
    category: 'food',
    variants: ['ಬಾದಾಮಿಹಾಲು', 'ಬಾದಾಮ್ ಹಾಲು', 'ಬಾದಾಮ ಹಾಲು'],
  },
  {
    kn: 'ಮಸಾಲೆ ಚಹಾ',
    translit: 'masala tea',
    en: 'Masala Tea',
    category: 'food',
    variants: ['ಮಸಾಲೆ ಟೀ', 'ಶುಂಠಿ ಟೀ', 'ಶುಂಠಿ ಚಹಾ'],
  },
  {
    kn: 'ನಿಂಬೆ ಹಣ್ಣಿನ ಜ್ಯೂಸ್',
    translit: 'nimbe juice',
    en: 'Fresh Lime Juice',
    category: 'food',
    variants: ['ನಿಂಬೆ ಜ್ಯೂಸ್', 'ನಿಂಬೆ ಪಾನಕ'],
  },
  {
    kn: 'ಕಬ್ಬಿನ ಹಾಲು',
    translit: 'kabbina haalu',
    en: 'Sugarcane Juice',
    category: 'food',
    variants: ['ಕಬ್ಬಿನ ರಸ'],
  },
  {
    kn: 'ಎಳನೀರು',
    translit: 'elaneeru',
    en: 'Tender Coconut',
    category: 'food',
    variants: ['ಎಳನೀರ', 'ಎಳೆನೀರು'],
  },

  // Single-word Darshini & Menu Classics
  {
    kn: 'ಇಡ್ಲಿ',
    translit: 'idli',
    en: 'Idli',
    category: 'food',
    variants: ['ಇಡ್ಲೀ', 'ಇಡಲಿ', 'ಇಡಲ', 'ಇಡ್ಲ', 'ಇದ್ಲಿ', 'ಇಲ್ಲಿ', 'ಇಡ್ಲಿಗಳು'],
  },
  {
    kn: 'ವಡೆ',
    translit: 'vada',
    en: 'Vada',
    category: 'food',
    variants: [
      'ವಡಾ',
      'ವಡೇ',
      'ವಡ',
      'ವಡಿ',
      'ವದೆ',
      'ವದೇ',
      'ವದ',
      'ಮಡೆ',
      'ಪಡೆ',
      'ವಣೆ',
      'ವರೆ',
      'ವಡೆಗಳು',
    ],
  },
  {
    kn: 'ದೋಸೆ',
    translit: 'dosa',
    en: 'Dosa',
    category: 'food',
    variants: ['ದೋಸಾ', 'ದೊಸೆ', 'ದೋಸೇ', 'ದೋಸ', 'ದೆಶೇ', 'ದೊಸಾ', 'ದೋಶೆ', 'ದೊಸ'],
  },
  {
    kn: 'ಮಸಾಲೆ',
    translit: 'masale',
    en: 'Masala',
    category: 'food',
    variants: ['ಮಸಾಲ', 'ಮಸಾಲೇ', 'ಮಸಾಲಾ', 'ಮಶಾಲೆ'],
  },
  {
    kn: 'ಬೆಣ್ಣೆ',
    translit: 'benne',
    en: 'Butter (Benne)',
    category: 'food',
    variants: ['ಬೆನ್ನೆ', 'ಬೆಣೇ', 'ಬೆಣೆ', 'ಬೆಣ್ಣೆ'],
  },
  {
    kn: 'ಬಟರ್',
    translit: 'butter',
    en: 'Butter',
    category: 'food',
    variants: ['ಬಟರ್‌', 'ಬಟರ', 'ಬಟ್ಟರ್'],
  },
  {
    kn: 'ಉದ್ದಿನ',
    translit: 'uddina',
    en: 'Urad Dal',
    category: 'food',
    variants: ['ಉದ್ದು', 'ಉದ್ದಿನ'],
  },
  {
    kn: 'ಖಾರಾ',
    translit: 'khara',
    en: 'Khara (Savory / Spicy)',
    category: 'food',
    variants: ['ಖಾರ', 'ಕಾರಾ', 'ಖಾರಾ', 'ಕಾರ'],
  },
  {
    kn: 'ಕೇಸರಿ',
    translit: 'kesari',
    en: 'Kesari (Saffron Sweet)',
    category: 'food',
    variants: ['ಕೆಸರಿ', 'ಕೇಸರೀ', 'ಕೇಶರಿ'],
  },
  {
    kn: 'ಚೌಚೌ',
    translit: 'chow chow',
    en: 'Chow Chow Bath',
    category: 'food',
    variants: ['ಚೌ', 'ಚಾಚಾ', 'ಚೊಚೊ', 'ಚೌಚಾ', 'ಜೌಜೌ'],
  },
  {
    kn: 'ಬಾತ್',
    translit: 'bath',
    en: 'Bath',
    category: 'food',
    variants: ['ಬಾತ', 'ಭಾತ್', 'ಭಾತ', 'ಬಾತು', 'ಬಾತ್‌'],
  },
  {
    kn: 'ರೈಸ್',
    translit: 'rice',
    en: 'Rice',
    category: 'food',
    variants: ['ರೈಸ್‌', 'ರೈಸ'],
  },
  {
    kn: 'ಪೂರಿ',
    translit: 'poori',
    en: 'Poori',
    category: 'food',
    variants: ['ಪುರಿ', 'ಪೂರೀ', 'ಪೊರಿ', 'ಪೂರಿಗಳು'],
  },
  {
    kn: 'ಸಾಗು',
    translit: 'saagu',
    en: 'Saagu (Veg Curry)',
    category: 'food',
    variants: ['ಸಾಗೂ', 'ಸಾಗ'],
  },
  {
    kn: 'ತಟ್ಟೆ',
    translit: 'thatte',
    en: 'Thatte (Plate)',
    category: 'food',
    variants: ['ತಟ್ಟೇ', 'ತಟೆ'],
  },
  {
    kn: 'ರವೆ',
    translit: 'rava',
    en: 'Rava (Semolina)',
    category: 'food',
    variants: ['ರವಾ', 'ರವ'],
  },
  {
    kn: 'ಉಪ್ಪಿಟ್ಟು',
    translit: 'uppittu',
    en: 'Upma (Uppittu)',
    category: 'food',
    variants: ['ಉಪ್ಪಿಟ್ಟ', 'ಉಪ್ಮಾ', 'ಉಪಿಟ್ಟು', 'ಉಪ್ಪಿಟು', 'ಉಷಪಷ್ಪೌಟ್ಟು'],
  },
  {
    kn: 'ಅವಲಕ್ಕಿ',
    translit: 'avalakki',
    en: 'Poha (Avalakki)',
    category: 'food',
    variants: ['ಅವಲಕ್ಕೀ', 'ಅವಲಕಿ'],
  },
  {
    kn: 'ಶಾವಿಗೆ',
    translit: 'shavige',
    en: 'Vermicelli (Shavige)',
    category: 'food',
    variants: ['ಸೇವಿಗೆ', 'ಶಾವಿಗೇ'],
  },
  {
    kn: 'ಪೊಂಗಲ್',
    translit: 'pongal',
    en: 'Pongal',
    category: 'food',
    variants: ['ಪೊಂಗಲ್‌', 'ಪೊಂಗಲ', 'ಪೊಂಗಲು', 'ಸಿಹಿ ಪೊಂಗಲ್', 'ಖಾರ ಪೊಂಗಲ್'],
  },
  {
    kn: 'ಪಲಾವ್',
    translit: 'palav',
    en: 'Veg Palav',
    category: 'food',
    variants: ['ಪುಲಾವ್', 'ಪಲಾವ್‌', 'ಪಲಾವ', 'ಪುಲಾವ', 'ಪಲಾವು'],
  },
  {
    kn: 'ಬಿರಿಯಾನಿ',
    translit: 'biryani',
    en: 'Biryani',
    category: 'food',
    variants: ['ಬಿರಿಯಾನೀ', 'ಬಿರ್ಯಾನಿ', 'ದಮ್ ಬಿರಿಯಾನಿ'],
  },
  {
    kn: 'ಖಾಲಿ',
    translit: 'khali',
    en: 'Plain (Khali Dosa)',
    category: 'food',
    variants: ['ಖಾಲೀ', 'ಕಾಲಿ'],
  },
  {
    kn: 'ಸಾದಾ',
    translit: 'saada',
    en: 'Plain (Sada)',
    category: 'food',
    variants: ['ಸಾದ'],
  },
  {
    kn: 'ಸೆಟ್',
    translit: 'set dosa',
    en: 'Set Dosa',
    category: 'food',
    variants: ['ಸೆಟ್‌', 'ಸೇಟ್', 'ಸೆಟ'],
  },
  {
    kn: 'ಈರುಳ್ಳಿ',
    translit: 'eerulli',
    en: 'Onion',
    category: 'food',
    variants: ['ಈರುಳಿ', 'ಈರುಳ್ಳೀ'],
  },
  {
    kn: 'ಪೇಪರ್',
    translit: 'paper',
    en: 'Paper Roast',
    category: 'food',
    variants: ['ಪೇಪರ್‌', 'ಪೇಪರ'],
  },
  {
    kn: 'ರೋಸ್ಟ್',
    translit: 'roast',
    en: 'Roast',
    category: 'food',
    variants: ['ರೋಸ್ಟ್‌', 'ರೋಸ್ಟ'],
  },
  {
    kn: 'ಮೆಂತ್ಯ',
    translit: 'menthya',
    en: 'Fenugreek (Methi)',
    category: 'food',
    variants: ['ಮೆಂತೆ', 'ಮೆಂತ್ಯದ'],
  },
  {
    kn: 'ಪಡ್ಡು',
    translit: 'paddu',
    en: 'Paddu (Paniyaram)',
    category: 'food',
    variants: ['ಗುಳಿಯಪ್ಪ', 'ಪಡ್ಡೂ'],
  },
  {
    kn: 'ಕಡುಬು',
    translit: 'kadubu',
    en: 'Steamed Kadubu',
    category: 'food',
    variants: ['ಇಡ್ಲಿ ಕಡುಬು'],
  },
  {
    kn: 'ಫಿಲ್ಟರ್',
    translit: 'filter',
    en: 'Filter Coffee',
    category: 'food',
    variants: ['ಫಿಲ್ಟರ್‌', 'ಫಿಲ್ಟರ', 'ಪಿಲ್ಟರ್'],
  },
  {
    kn: 'ಕಾಫಿ',
    translit: 'coffee',
    en: 'Coffee',
    category: 'food',
    variants: ['ಕಾಫೀ', 'ಕಾಪಿ', 'ಕಫಿ', 'ಕಾಫಿ'],
  },
  {
    kn: 'ಚಹಾ',
    translit: 'chaha',
    en: 'Tea',
    category: 'food',
    variants: ['ಚಾ', 'ಚಹ'],
  },
  {
    kn: 'ಟೀ',
    translit: 'tea',
    en: 'Tea',
    category: 'food',
    variants: ['ಟಿ', 'ಟೀ'],
  },
  {
    kn: 'ಹಾಲು',
    translit: 'haalu',
    en: 'Milk',
    category: 'food',
    variants: ['ಹಾಲ', 'ಬಿಸಿ ಹಾಲು'],
  },
  {
    kn: 'ಬಾದಾಮಿ',
    translit: 'badami',
    en: 'Badam (Almond)',
    category: 'food',
    variants: ['ಬಾದಾಮ್', 'ಬಾದಾಮ'],
  },
  {
    kn: 'ಕಷಾಯ',
    translit: 'kashaya',
    en: 'Herbal Kashaya',
    category: 'food',
    variants: ['ಕಷಾಯಂ'],
  },
  {
    kn: 'ಸಾಂಬಾರ್',
    translit: 'sambar',
    en: 'Sambar',
    category: 'food',
    variants: ['ಸಾಂಬಾರು', 'ಸಾಂಬಾರ್‌', 'ಸಂಬಾರ್', 'ಸಾಂಬಾರ'],
  },
  {
    kn: 'ಚಟ್ನಿ',
    translit: 'chutney',
    en: 'Chutney',
    category: 'food',
    variants: ['ಚಟ್ನೀ', 'ಚಟನಿ', 'ಚಟ್ಣಿ', 'ಕಾಯಿ ಚಟ್ನಿ'],
  },
  {
    kn: 'ರಸಂ',
    translit: 'rasam',
    en: 'Rasam (Saaru)',
    category: 'food',
    variants: ['ಸಾರು', 'ತಿಳಿ ಸಾರು', 'ರಸಮ್'],
  },
  {
    kn: 'ಪಲ್ಯ',
    translit: 'palya',
    en: 'Vegetable Palya',
    category: 'food',
    variants: ['ಪಲ್ಯಾ'],
  },
  {
    kn: 'ಕೋಸಂಬರಿ',
    translit: 'kosambari',
    en: 'Kosambari Salad',
    category: 'food',
    variants: ['ಕೊಸಂಬರಿ'],
  },
  {
    kn: 'ಹಪ್ಪಳ',
    translit: 'happala',
    en: 'Papad (Happala)',
    category: 'food',
    variants: ['ಹಪ್ಪಳಾ'],
  },
  {
    kn: 'ಉಪ್ಪಿನಕಾಯಿ',
    translit: 'uppinakayi',
    en: 'Pickle',
    category: 'food',
    variants: ['ಉಪ್ಪಿನ ಕಾಯಿ'],
  },
  {
    kn: 'ಬಿಸಿ',
    translit: 'bisi',
    en: 'Hot / Fresh',
    category: 'food',
    variants: ['ಬಿಸಿಯಾದ'],
  },
  {
    kn: 'ಬೇಳೆ',
    translit: 'bele',
    en: 'Dal / Lentil',
    category: 'food',
    variants: ['ಬೇಲೆ', 'ತೊಗರಿ ಬೇಳೆ'],
  },
  {
    kn: 'ಮೊಸರು',
    translit: 'mosaru',
    en: 'Curd (Yogurt)',
    category: 'food',
    variants: ['ಮೊಸರ'],
  },
  {
    kn: 'ಮಜ್ಜಿಗೆ',
    translit: 'majjige',
    en: 'Buttermilk (Majjige)',
    category: 'food',
    variants: ['ಮಜ್ಜಿಗೇ', 'ಮಸಾಲೆ ಮಜ್ಜಿಗೆ'],
  },
  {
    kn: 'ಲಸ್ಸಿ',
    translit: 'lassi',
    en: 'Sweet Lassi',
    category: 'food',
    variants: ['ಲಸ್ಸೀ'],
  },
  {
    kn: 'ಅನ್ನ',
    translit: 'anna',
    en: 'Steamed Rice',
    category: 'food',
    variants: ['ಅನ್ನಾ', 'ಬಿಳಿ ಅನ್ನ'],
  },
  {
    kn: 'ಮದ್ದೂರು',
    translit: 'maddur',
    en: 'Maddur Vada',
    category: 'food',
    variants: ['ಮದ್ದೂರ್', 'ಮದ್ದೂರ'],
  },
  {
    kn: 'ಬೋಂಡಾ',
    translit: 'bonda',
    en: 'Bonda',
    category: 'food',
    variants: ['ಬೊಂಡಾ', 'ಬೋಂಡ', 'ಬೊಂಡ'],
  },
  {
    kn: 'ಬಜ್ಜಿ',
    translit: 'bajji',
    en: 'Bajji (Fritter)',
    category: 'food',
    variants: ['ಬಜ್ಜೀ'],
  },
  {
    kn: 'ಪಕೋಡ',
    translit: 'pakoda',
    en: 'Pakoda',
    category: 'food',
    variants: ['ಪಕೋಡಾ', 'ಪಕೊಡ', 'ಈರುಳ್ಳಿ ಪಕೋಡ'],
  },
  {
    kn: 'ಸಮೋಸ',
    translit: 'samosa',
    en: 'Samosa',
    category: 'food',
    variants: ['ಸಮೋಸಾ', 'ಸಮೊಸ'],
  },
  {
    kn: 'ಕಚೋರಿ',
    translit: 'kachori',
    en: 'Kachori',
    category: 'food',
    variants: ['ಕಚೌರಿ'],
  },
  {
    kn: 'ಮಂಗಳೂರು',
    translit: 'mangaluru',
    en: 'Mangalore Style',
    category: 'food',
    variants: ['ಮಂಗಳೂರ'],
  },
  {
    kn: 'ಬನ್ಸ್',
    translit: 'buns',
    en: 'Mangalore Buns',
    category: 'food',
    variants: ['ಬನ್ಸ್‌', 'ಬನ್ಸ'],
  },
  {
    kn: 'ಚಪಾತಿ',
    translit: 'chapati',
    en: 'Chapati',
    category: 'food',
    variants: ['ಚಪಾತೀ', 'ಚಪ್ಪಾತಿ', 'ಚಪಾತಿ ಊಟ'],
  },
  {
    kn: 'ಪರೋಟ',
    translit: 'parotta',
    en: 'Parotta',
    category: 'food',
    variants: ['ಪರೋಟಾ', 'ಪರೊಟ', 'ಪರಾಠ'],
  },
  {
    kn: 'ರೊಟ್ಟಿ',
    translit: 'rotti',
    en: 'Rotti',
    category: 'food',
    variants: ['ರೊಟ್ಟೀ'],
  },
  {
    kn: 'ಅಕ್ಕಿ',
    translit: 'akki',
    en: 'Rice (Akki)',
    category: 'food',
    variants: ['ಅಕ್ಕೀ'],
  },
  {
    kn: 'ರಾಗಿ',
    translit: 'ragi',
    en: 'Ragi (Finger Millet)',
    category: 'food',
  },
  {
    kn: 'ಮುದ್ದೆ',
    translit: 'mudde',
    en: 'Ragi Mudde',
    category: 'food',
  },
  {
    kn: 'ಜೋಳ',
    translit: 'jola',
    en: 'Jowar (Sorghum)',
    category: 'food',
    variants: ['ಜೋಳದ'],
  },
  {
    kn: 'ಗೋಧಿ',
    translit: 'godhi',
    en: 'Wheat',
    category: 'food',
    variants: ['ಗೋಧಿ ದೋಸೆ'],
  },
  {
    kn: 'ಊಟ',
    translit: 'oota',
    en: 'Meals (Oota)',
    category: 'food',
    variants: ['ಊಟದ', 'ಊಟಗಳು', 'ಲಊೂಟ', 'ಲೂಟ', 'ದಕ್ಷಿಣ ಭಾರತದ ಊಟ', 'ಬಾಳೆ ಎಲೆ ಊಟ'],
  },
  {
    kn: 'ತಿಂಡಿ',
    translit: 'thindi',
    en: 'Tiffin / Snacks',
    category: 'food',
    variants: ['ತಿಂಡಿಗಳು'],
  },
  {
    kn: 'ಉಪಹಾರ',
    translit: 'upahara',
    en: 'Tiffin / Refreshments',
    category: 'food',
    variants: ['ಉಪಾಹಾರ', 'ಉಪಹಾರದ', 'ಉಪಹಾರ ಮಂದಿರ'],
  },
  {
    kn: 'ದರ್ಶಿನಿ',
    translit: 'darshini',
    en: 'Darshini Cafe',
    category: 'food',
    variants: ['ದರ್ಶಿನೀ'],
  },
  {
    kn: 'ಸಾಗರ',
    translit: 'sagara',
    en: 'Sagar (Hotel)',
    category: 'food',
    variants: ['ಸಾಗರ್'],
  },
  {
    kn: 'ಭವನ',
    translit: 'bhavan',
    en: 'Bhavan',
    category: 'food',
    variants: ['ಭವನ್', 'ಭವನ್‌'],
  },
  {
    kn: 'ಹೋಟೆಲ್',
    translit: 'hotel',
    en: 'Hotel / Restaurant',
    category: 'food',
    variants: ['ಹೋಟೆಲ್‌', 'ಹೊಟೇಲ್', 'ಹೋಟೆಲ'],
  },
  {
    kn: 'ಕ್ಯಾಂಟೀನ್',
    translit: 'canteen',
    en: 'Canteen',
    category: 'food',
    variants: ['ಕ್ಯಾಂಟೀನ್‌', 'ಕ್ಯಾಂಟೀನ', 'ಇಂದಿರಾ ಕ್ಯಾಂಟೀನ್'],
  },
  {
    kn: 'ಮೆಸ್',
    translit: 'mess',
    en: 'Mess / Dining Hall',
    category: 'food',
    variants: ['ಮೆಸ್‌'],
  },
  {
    kn: 'ವಿಶೇಷ',
    translit: 'vishesha',
    en: 'Today’s Special',
    category: 'food',
  },
  {
    kn: 'ಸ್ಪೆಷಲ್',
    translit: 'special',
    en: 'Special',
    category: 'food',
    variants: ['ಸ್ಪೆಷಲ್‌', 'ಸ್ಪೆಶಲ್'],
  },
  {
    kn: 'ಪಾರ್ಸೆಲ್',
    translit: 'parcel',
    en: 'Parcel / Takeaway',
    category: 'food',
    variants: ['ಪಾರ್ಸೆಲ್‌', 'ಪಾರ್ಸಲ್', 'ಪಾರ್ಸೆಲ'],
  },
  {
    kn: 'ಕೌಂಟರ್',
    translit: 'counter',
    en: 'Token Counter',
    category: 'food',
    variants: ['ಕೌಂಟರ್‌', 'ಕೌಂಟರ'],
  },
  {
    kn: 'ಟೋಕನ್',
    translit: 'token',
    en: 'Token',
    category: 'food',
    variants: ['ಟೋಕನ್‌', 'ಟೋಕನ'],
  },
  {
    kn: 'ಬಿಲ್',
    translit: 'bill',
    en: 'Bill',
    category: 'food',
    variants: ['ಬಿಲ್‌'],
  },
  {
    kn: 'ಸ್ವಯಂ ಸೇವೆ',
    translit: 'swayam seve',
    en: 'Self Service',
    category: 'food',
    variants: ['ಸೆಲ್ಫ್ ಸರ್ವಿಸ್'],
  },
  {
    kn: 'ನೀರು',
    translit: 'neeru',
    en: 'Water',
    category: 'food',
    variants: ['ನೀರ', 'ಬಿಸಿ ನೀರು'],
  },
  {
    kn: 'ಸಕ್ಕರೆ',
    translit: 'sakkare',
    en: 'Sugar',
    category: 'food',
  },
  {
    kn: 'ಬೆಲ್ಲ',
    translit: 'bella',
    en: 'Jaggery (Bella)',
    category: 'food',
    variants: ['ಬೆಲ್ಲದ', 'ಬೆಲ್ಲದ ಕಾಫಿ'],
  },
  {
    kn: 'ಉಪ್ಪು',
    translit: 'uppu',
    en: 'Salt',
    category: 'food',
  },
  {
    kn: 'ತುಪ್ಪ',
    translit: 'tuppa',
    en: 'Pure Ghee',
    category: 'food',
    variants: ['ತುಪ್ಪದ'],
  },
  {
    kn: 'ಎಣ್ಣೆ',
    translit: 'enne',
    en: 'Cooking Oil',
    category: 'food',
  },
  {
    kn: 'ತೆಂಗಿನಕಾಯಿ',
    translit: 'tenginakayi',
    en: 'Coconut',
    category: 'food',
    variants: ['ಕಾಯಿ'],
  },
  {
    kn: 'ಶುಂಠಿ',
    translit: 'shunthi',
    en: 'Ginger',
    category: 'food',
  },
  {
    kn: 'ಬೆಳ್ಳುಳ್ಳಿ',
    translit: 'bellulli',
    en: 'Garlic',
    category: 'food',
  },
  {
    kn: 'ನಿಂಬೆ',
    translit: 'nimbe',
    en: 'Lemon',
    category: 'food',
    variants: ['ನಿಂಬೆಹಣ್ಣು'],
  },
  {
    kn: 'ಹಣ್ಣು',
    translit: 'hannu',
    en: 'Fruit',
    category: 'food',
    variants: ['ಹಣ್ಣಿನ'],
  },
  {
    kn: 'ಜ್ಯೂಸ್',
    translit: 'juice',
    en: 'Fresh Juice',
    category: 'food',
    variants: ['ಜ್ಯೂಸ್‌', 'ಜ್ಯೂಸ'],
  },
  {
    kn: 'ಐಸ್ ಕ್ರೀಮ್',
    translit: 'ice cream',
    en: 'Ice Cream',
    category: 'food',
    variants: ['ಐಸ್‌ಕ್ರೀಮ್', 'ಐಸ್ ಕ್ರೀಂ'],
  },
  {
    kn: 'ಸಿಹಿ',
    translit: 'sihi',
    en: 'Sweet',
    category: 'food',
    variants: ['ಸಿಹಿ ತಿಂಡಿ'],
  },
  {
    kn: 'ಹೋಳಿಗೆ',
    translit: 'holige',
    en: 'Holige (Obbattu)',
    category: 'food',
    variants: ['ಒಬ್ಬಟ್ಟು', 'ಬೇಳೆ ಹೋಳಿಗೆ', 'ಕಾಯಿ ಹೋಳಿಗೆ', 'ಶೇಂಗಾ ಹೋಳಿಗೆ'],
  },
  {
    kn: 'ಒಬ್ಬಟ್ಟು',
    translit: 'obbattu',
    en: 'Obbattu (Sweet Flatbread)',
    category: 'food',
    variants: ['ಒಬ್ಬಟ್ಟೂ'],
  },
  {
    kn: 'ಮೈಸೂರು ಪಾಕ್',
    translit: 'mysore pak',
    en: 'Mysore Pak',
    category: 'food',
    variants: ['ಮೈಸೂರುಪಾಕ್', 'ಮೈಸೂರ್ ಪಾಕ್'],
  },
  {
    kn: 'ಮೈಸೂರು',
    translit: 'mysuru',
    en: 'Mysore',
    category: 'food',
    variants: ['ಮೈಸೂರ್', 'ಮೈಸೂರ'],
  },
  {
    kn: 'ಪಾಕ್',
    translit: 'mysore pak',
    en: 'Mysore Pak',
    category: 'food',
    variants: ['ಪಾಕ್‌', 'ಪಾಕ'],
  },
  {
    kn: 'ಪಾಯಸ',
    translit: 'payasa',
    en: 'Payasa (Kheer)',
    category: 'food',
    variants: ['ಪಾಯಸಂ', 'ಶಾವಿಗೆ ಪಾಯಸ', 'ಹೆಸರುಬೇಳೆ ಪಾಯಸ'],
  },
  {
    kn: 'ಜಾಮೂನು',
    translit: 'jamoon',
    en: 'Gulab Jamun',
    category: 'food',
    variants: ['ಜಾಮೂನ್', 'ಗುಲಾಬ್ ಜಾಮೂನ್'],
  },
  {
    kn: 'ಜಿಲೇಬಿ',
    translit: 'jalebi',
    en: 'Jalebi',
    category: 'food',
    variants: ['ಜಲೇಬಿ', 'ಜಿಲೆಬಿ'],
  },
  {
    kn: 'ಹಲ್ವಾ',
    translit: 'halwa',
    en: 'Halwa',
    category: 'food',
    variants: ['ಹಲ್ವ', 'ಕ್ಯಾರೆಟ್ ಹಲ್ವಾ', 'ಕಾಶಿ ಹಲ್ವಾ'],
  },
  {
    kn: 'ಚಿರೋಟಿ',
    translit: 'chiroti',
    en: 'Chiroti',
    category: 'food',
    variants: ['ಚಿರೋಟೀ'],
  },
  {
    kn: 'ಲಡ್ಡು',
    translit: 'laddu',
    en: 'Laddu (Unde)',
    category: 'food',
    variants: ['ಉಂಡೆ', 'ಬೇಸನ್ ಲಡ್ಡು', 'ಮೋತಿಚೂರ್ ಲಡ್ಡು'],
  },
  {
    kn: 'ಕೋಡುಬಳೆ',
    translit: 'kodubale',
    en: 'Kodubale (Spiced Rings)',
    category: 'food',
    variants: ['ಕೊಡುಬಳೆ'],
  },
  {
    kn: 'ಚಕ್ಕುಲಿ',
    translit: 'chakkuli',
    en: 'Chakli (Chakkuli)',
    category: 'food',
    variants: ['ಚಕ್ಲಿ'],
  },
  {
    kn: 'ನಿಪ್ಪಟ್ಟು',
    translit: 'nippattu',
    en: 'Nippattu (Crispy Rice Disc)',
    category: 'food',
  },
  {
    kn: 'ಸಸ್ಯಾಹಾರಿ',
    translit: 'sasyahari',
    en: 'Pure Vegetarian',
    category: 'food',
    variants: ['ಶುದ್ಧ ಸಸ್ಯಾಹಾರಿ'],
  },
  {
    kn: 'ಶುದ್ಧ',
    translit: 'shuddha',
    en: 'Pure',
    category: 'food',
  },
  {
    kn: 'ಮಾಂಸಾಹಾರಿ',
    translit: 'mamsahari',
    en: 'Non-Vegetarian',
    category: 'food',
    variants: ['ಮಿಲಿಟರಿ ಹೋಟೆಲ್'],
  },
  {
    kn: 'ಸ್ವೀಟ್ಸ್',
    translit: 'sweets',
    en: 'Sweets',
    category: 'food',
    variants: ['ಸ್ವೀಟ್ಸ್‌'],
  },
  {
    kn: 'ಬೇಕರಿ',
    translit: 'bakery',
    en: 'Bakery',
    category: 'food',
    variants: ['ಬೆಕರಿ', 'ಕಾಂಡಿಮೆಂಟ್ಸ್'],
  },
  {
    kn: 'ಉಡುಪಿ',
    translit: 'udupi',
    en: 'Udupi',
    category: 'food',
    variants: ['ಉಡುಪಿ ಹೋಟೆಲ್'],
  },
  {
    kn: 'ಗೋಬಿ ಮಂಚೂರಿ',
    translit: 'gobi manchurian',
    en: 'Gobi Manchurian',
    category: 'food',
    variants: ['ಗೋಬಿ', 'ಗೋಬಿ ಮಂಚೂರಿಯನ್'],
  },
  {
    kn: 'ಫ್ರೈಡ್ ರೈಸ್',
    translit: 'fried rice',
    en: 'Fried Rice',
    category: 'food',
    variants: ['ಫ್ರೈಡ್‌ ರೈಸ್'],
  },
  {
    kn: 'ನೂಡಲ್ಸ್',
    translit: 'noodles',
    en: 'Noodles',
    category: 'food',
    variants: ['ನೂಡಲ್ಸ್‌'],
  },

  // =========================================================================
  // 2. TRAVEL, BMTC, METRO & BENGALURU NEIGHBORHOODS
  // =========================================================================
  {
    kn: 'ಬೆಂಗಳೂರು',
    translit: 'bengaluru',
    en: 'Bengaluru',
    category: 'travel',
    variants: ['ಬೆಂಗಳೂರ', 'ಬೆಂಗಳೂರಿನ'],
  },
  {
    kn: 'ಮೆಜೆಸ್ಟಿಕ್',
    translit: 'majestic',
    en: 'Majestic',
    category: 'travel',
    variants: ['ಮೆಜೆಸ್ಟಿಕ್‌', 'ಮೆಜೆಸ್ಟಿಕ್ಗೆ', 'ಮೆಜೆಸ್ಟಿಕ'],
  },
  {
    kn: 'ಕೆಂಪೇಗೌಡ',
    translit: 'kempegowda',
    en: 'Kempegowda (Majestic)',
    category: 'travel',
    variants: ['ಕೆಂಪೇಗೌಡ ಬಸ್ ನಿಲ್ದಾಣ'],
  },
  {
    kn: 'ಬಸ್ ನಿಲ್ದಾಣ',
    translit: 'bus nildana',
    en: 'Bus Stand',
    category: 'travel',
    variants: ['ಬಸ್‌ ನಿಲ್ದಾಣ', 'ಬಸ್ ನಿಲ್ದಾಣದ'],
  },
  {
    kn: 'ಬಸ್',
    translit: 'bus',
    en: 'Bus',
    category: 'travel',
    variants: ['ಬಸ್‌', 'ಬಸ್ಸು'],
  },
  {
    kn: 'ನಿಲ್ದಾಣ',
    translit: 'nildana',
    en: 'Station / Stand',
    category: 'travel',
    variants: ['ನಿಲ್ದಾಣದ', 'ನಿಲ್ದಾಣಕ್ಕೆ'],
  },
  {
    kn: 'ನಮ್ಮ ಮೆಟ್ರೋ',
    translit: 'namma metro',
    en: 'Namma Metro',
    category: 'travel',
    variants: ['ನಮ್ಮಮೆಟ್ರೋ', 'ಮೆಟ್ರೋ ರೈಲು'],
  },
  {
    kn: 'ಮೆಟ್ರೋ',
    translit: 'metro',
    en: 'Metro',
    category: 'travel',
    variants: ['ಮೆಟ್ರೊ'],
  },
  {
    kn: 'ನಮ್ಮ',
    translit: 'namma',
    en: 'Namma (Our)',
    category: 'travel',
  },
  {
    kn: 'ರೈಲು ನಿಲ್ದಾಣ',
    translit: 'railu nildana',
    en: 'Railway Station',
    category: 'travel',
    variants: ['ರೈಲ್ವೆ ನಿಲ್ದಾಣ'],
  },
  {
    kn: 'ರೈಲು',
    translit: 'railu',
    en: 'Train / Railway',
    category: 'travel',
    variants: ['ರೈಲ್ವೆ'],
  },
  {
    kn: 'ಆಟೋ',
    translit: 'auto',
    en: 'Auto Rickshaw',
    category: 'travel',
    variants: ['ಆಟೊ', 'ಆಟೋ ನಿಲ್ದಾಣ'],
  },
  {
    kn: 'ಟ್ಯಾಕ್ಸಿ',
    translit: 'taxi',
    en: 'Taxi / Cab',
    category: 'travel',
  },
  {
    kn: 'ಟಿಕೆಟ್',
    translit: 'ticket',
    en: 'Ticket',
    category: 'travel',
    variants: ['ಟಿಕೆಟ್‌', 'ಟಿಕೇಟ್', 'ಟಿಕೆಟ'],
  },
  {
    kn: 'ಪ್ಲಾಟ್‌ಫಾರ್ಮ್',
    translit: 'platform',
    en: 'Platform',
    category: 'travel',
    variants: ['ಪ್ಲಾಟ್ಫಾರ್ಮ್', 'ಪ್ಲಾಟ್‌ಫಾರ್ಮ್‌'],
  },
  {
    kn: 'ಮಾರ್ಗ',
    translit: 'marga',
    en: 'Route',
    category: 'travel',
    variants: ['ಮಾರ್ಗಗಳು'],
  },
  {
    kn: 'ಸಂಖ್ಯೆ',
    translit: 'sankhye',
    en: 'Number',
    category: 'travel',
  },
  {
    kn: 'ಹೋಗುವ',
    translit: 'hoguva',
    en: 'Going To',
    category: 'travel',
  },
  {
    kn: 'ಬರುವ',
    translit: 'baruva',
    en: 'Arriving',
    category: 'travel',
  },
  {
    kn: 'ಇಂದಿರಾನಗರ',
    translit: 'indiranagar',
    en: 'Indiranagar',
    category: 'travel',
    variants: ['ಇಂದಿರಾನಗರಕ್ಕೆ', 'ಇಂದಿರಾ ನಗರ'],
  },
  {
    kn: 'ಕೋರಮಂಗಲ',
    translit: 'koramangala',
    en: 'Koramangala',
    category: 'travel',
    variants: ['ಕೊರಮಂಗಲ'],
  },
  {
    kn: 'ಜಯನಗರ',
    translit: 'jayanagar',
    en: 'Jayanagar',
    category: 'travel',
    variants: ['ಜಯನಗರದ'],
  },
  {
    kn: 'ಮಲ್ಲೇಶ್ವರಂ',
    translit: 'malleshwaram',
    en: 'Malleshwaram',
    category: 'travel',
    variants: ['ಮಲ್ಲೇಶ್ವರ'],
  },
  {
    kn: 'ರಾಜಾಜಿನಗರ',
    translit: 'rajajinagar',
    en: 'Rajajinagar',
    category: 'travel',
  },
  {
    kn: 'ಬಸವನಗುಡಿ',
    translit: 'basavanagudi',
    en: 'Basavanagudi',
    category: 'travel',
  },
  {
    kn: 'ಶಿವಾಜಿನಗರ',
    translit: 'shivajinagar',
    en: 'Shivajinagar',
    category: 'travel',
  },
  {
    kn: 'ವೈಟ್‌ಫೀಲ್ಡ್',
    translit: 'whitefield',
    en: 'Whitefield',
    category: 'travel',
    variants: ['ವೈಟ್ಫೀಲ್ಡ್'],
  },
  {
    kn: 'ಯಶವಂತಪುರ',
    translit: 'yeshwanthpur',
    en: 'Yeshwanthpur',
    category: 'travel',
  },
  {
    kn: 'ಬನಶಂಕರಿ',
    translit: 'banashankari',
    en: 'Banashankari',
    category: 'travel',
  },
  {
    kn: 'ಹೆಬ್ಬಾಳ',
    translit: 'hebbal',
    en: 'Hebbal',
    category: 'travel',
  },
  {
    kn: 'ಯಲಹಂಕ',
    translit: 'yelahanka',
    en: 'Yelahanka',
    category: 'travel',
  },
  {
    kn: 'ವಿಜಯನಗರ',
    translit: 'vijayanagar',
    en: 'Vijayanagar',
    category: 'travel',
  },
  {
    kn: 'ಮಾರತ್ತಹಳ್ಳಿ',
    translit: 'marathahalli',
    en: 'Marathahalli',
    category: 'travel',
    variants: ['ಮಾರತಹಳ್ಳಿ'],
  },
  {
    kn: 'ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಸಿಟಿ',
    translit: 'electronic city',
    en: 'Electronic City',
    category: 'travel',
    variants: ['ಎಲೆಕ್ಟ್ರಾನಿಕ್‌ ಸಿಟಿ'],
  },
  {
    kn: 'ಕೆಂಗೇರಿ',
    translit: 'kengeri',
    en: 'Kengeri',
    category: 'travel',
  },
  {
    kn: 'ಕೃಷ್ಣರಾಜಪುರ',
    translit: 'kr puram',
    en: 'KR Puram',
    category: 'travel',
    variants: ['ಕೆ ಆರ್ ಪುರಂ'],
  },
  {
    kn: 'ಸಿಲ್ಕ್ ಬೋರ್ಡ್',
    translit: 'silk board',
    en: 'Silk Board',
    category: 'travel',
    variants: ['ಸಿಲ್ಕ್‌ ಬೋರ್ಡ್'],
  },
  {
    kn: 'ಸಿಲ್ಕ್',
    translit: 'silk',
    en: 'Silk Board',
    category: 'travel',
    variants: ['ಸಿಲ್ಕ್‌'],
  },
  {
    kn: 'ಬೋರ್ಡ್',
    translit: 'board',
    en: 'Board',
    category: 'travel',
    variants: ['ಬೋರ್ಡ್‌'],
  },
  {
    kn: 'ಮಾರ್ಕೆಟ್',
    translit: 'market',
    en: 'Market',
    category: 'travel',
    variants: ['ಮಾರ್ಕೆಟ್‌', 'ಮಾರುಕಟ್ಟೆ'],
  },
  {
    kn: 'ಮಾರುಕಟ್ಟೆ',
    translit: 'marukatte',
    en: 'Market',
    category: 'travel',
  },
  {
    kn: 'ವಿಧಾನ ಸೌಧ',
    translit: 'vidhana soudha',
    en: 'Vidhana Soudha',
    category: 'travel',
  },
  {
    kn: 'ವಿಧಾನ',
    translit: 'vidhana',
    en: 'Vidhana Soudha',
    category: 'travel',
  },
  {
    kn: 'ಸೌಧ',
    translit: 'soudha',
    en: 'Soudha',
    category: 'travel',
  },
  {
    kn: 'ಕಬ್ಬನ್ ಪಾರ್ಕ್',
    translit: 'cubbon park',
    en: 'Cubbon Park',
    category: 'travel',
  },
  {
    kn: 'ಲಾಲ್‌ಬಾಗ್',
    translit: 'lalbagh',
    en: 'Lalbagh Botanical Garden',
    category: 'travel',
    variants: ['ಲಾಲ್ಬಾಗ್', 'ಲಾಲ್‌ಬಾಗ್‌'],
  },
  {
    kn: 'ವಿಮಾನ ನಿಲ್ದಾಣ',
    translit: 'vimana nildana',
    en: 'Airport',
    category: 'travel',
  },
  {
    kn: 'ವಿಮಾನ',
    translit: 'vimana',
    en: 'Airport / Flight',
    category: 'travel',
  },
  {
    kn: 'ಎಡಕ್ಕೆ',
    translit: 'edakke',
    en: 'Turn Left',
    category: 'travel',
    variants: ['ಎಡಗಡೆ', 'ಎಡ'],
  },
  {
    kn: 'ಬಲಕ್ಕೆ',
    translit: 'balakke',
    en: 'Turn Right',
    category: 'travel',
    variants: ['ಬಲಗಡೆ', 'ಬಲ'],
  },
  {
    kn: 'ನೇರವಾಗಿ',
    translit: 'neravagi',
    en: 'Straight Ahead',
    category: 'travel',
  },
  {
    kn: 'ಮುಂದೆ',
    translit: 'munde',
    en: 'Ahead',
    category: 'travel',
  },
  {
    kn: 'ಹಿಂದೆ',
    translit: 'hinde',
    en: 'Behind',
    category: 'travel',
  },
  {
    kn: 'ಹತ್ತಿರ',
    translit: 'hattira',
    en: 'Near',
    category: 'travel',
  },
  {
    kn: 'ದೂರ',
    translit: 'doora',
    en: 'Far / Distance',
    category: 'travel',
  },
  {
    kn: 'ಒಳಗೆ',
    translit: 'olage',
    en: 'Inside',
    category: 'travel',
  },
  {
    kn: 'ಹೊರಗೆ',
    translit: 'horage',
    en: 'Outside',
    category: 'travel',
  },
  {
    kn: 'ಮೇಲೆ',
    translit: 'mele',
    en: 'Upstairs / Above',
    category: 'travel',
  },
  {
    kn: 'ಕೆಳಗೆ',
    translit: 'kelage',
    en: 'Downstairs / Below',
    category: 'travel',
  },
  {
    kn: 'ಪ್ರವೇಶ',
    translit: 'pravesha',
    en: 'Entry',
    category: 'travel',
    variants: ['ಪ್ರವೇಶದ್ವಾರ'],
  },
  {
    kn: 'ನಿರ್ಗಮನ',
    translit: 'nirgamana',
    en: 'Exit',
    category: 'travel',
    variants: ['ಹೊರಹೋಗುವ ದಾರಿ'],
  },
  {
    kn: 'ದಾರಿ',
    translit: 'daari',
    en: 'Way / Path',
    category: 'travel',
  },
  {
    kn: 'ರಸ್ತೆ',
    translit: 'raste',
    en: 'Road',
    category: 'travel',
    variants: ['ರಸ್ತೆಯ'],
  },
  {
    kn: 'ಕ್ರಾಸ್',
    translit: 'cross',
    en: 'Cross Road',
    category: 'travel',
    variants: ['ಕ್ರಾಸ್‌', 'ಅಡ್ಡರಸ್ತೆ'],
  },
  {
    kn: 'ಮೇನ್',
    translit: 'main road',
    en: 'Main Road',
    category: 'travel',
    variants: ['ಮೇನ್‌', 'ಮುಖ್ಯ ರಸ್ತೆ'],
  },
  {
    kn: 'ವೃತ್ತ',
    translit: 'vrutta',
    en: 'Circle / Junction',
    category: 'travel',
    variants: ['ಸರ್ಕಲ್'],
  },
  {
    kn: 'ಸೇತುವೆ',
    translit: 'setuve',
    en: 'Bridge / Flyover',
    category: 'travel',
    variants: ['ಮೇಲ್ಸೇತುವೆ'],
  },
  {
    kn: 'ಸಿಗ್ನಲ್',
    translit: 'signal',
    en: 'Traffic Signal',
    category: 'travel',
    variants: ['ಸಿಗ್ನಲ್‌'],
  },
  {
    kn: 'ಪ್ರಯಾಣಿಕರ',
    translit: 'prayanikara',
    en: 'Passengers',
    category: 'travel',
    variants: ['ಪ್ರಯಾಣಿಕರು', 'ಪ್ರಯಾಣಿಕರಿಗೆ'],
  },
  {
    kn: 'ಗಮನಕ್ಕೆ',
    translit: 'gamanakke',
    en: 'Kind Attention',
    category: 'travel',
  },
  {
    kn: 'ಸಮಯ',
    translit: 'samaya',
    en: 'Timings',
    category: 'travel',
    variants: ['ವೇಳಾಪಟ್ಟಿ'],
  },
  {
    kn: 'ವೇಗ',
    translit: 'vega',
    en: 'Express / Speed',
    category: 'travel',
    variants: ['ವೇಗದೂತ'],
  },
  {
    kn: 'ಸಾಮಾನ್ಯ',
    translit: 'samanya',
    en: 'Ordinary / General',
    category: 'travel',
  },
  {
    kn: 'ವಜ್ರ',
    translit: 'vajra',
    en: 'BMTC Vajra AC Bus',
    category: 'travel',
    variants: ['ವಾಯುವಜ್ರ'],
  },
  {
    kn: 'ಮಹಿಳೆಯರ',
    translit: 'mahileyara',
    en: 'Ladies',
    category: 'travel',
    variants: ['ಮಹಿಳೆಯರಿಗೆ'],
  },
  {
    kn: 'ಆಸನ',
    translit: 'asana',
    en: 'Seat',
    category: 'travel',
    variants: ['ಸೀಟ್', 'ಆಸನಗಳು'],
  },
  {
    kn: 'ಮೀಸಲು',
    translit: 'meesalu',
    en: 'Reserved',
    category: 'travel',
    variants: ['ಮೀಸಲಾಗಿದೆ'],
  },
  {
    kn: 'ಚಾಲಕ',
    translit: 'chalaka',
    en: 'Driver',
    category: 'travel',
    variants: ['ಚಾಲಕರು'],
  },
  {
    kn: 'ನಿರ್ವಾಹಕ',
    translit: 'nirvahaka',
    en: 'Conductor',
    category: 'travel',
    variants: ['ನಿರ್ವಾಹಕರು'],
  },
  {
    kn: 'ಪಾಸ್',
    translit: 'bus pass',
    en: 'Bus Pass',
    category: 'travel',
    variants: ['ಪಾಸ್‌', 'ದಿನದ ಪಾಸ್'],
  },
  {
    kn: 'ಬಾಗಿಲು',
    translit: 'baagilu',
    en: 'Door',
    category: 'travel',
    variants: ['ಸ್ವಯಂಚಾಲಿತ ಬಾಗಿಲು'],
  },
  {
    kn: 'ನಿಲ್ಲಿ',
    translit: 'nilli',
    en: 'Stop',
    category: 'travel',
    variants: ['ನಿಲ್ಲಿಸಿ'],
  },
  {
    kn: 'ಹೊರಡುವ',
    translit: 'horaduva',
    en: 'Departure',
    category: 'travel',
  },
  {
    kn: 'ಆಗಮನ',
    translit: 'agamana',
    en: 'Arrival',
    category: 'travel',
  },
  {
    kn: 'ಸಾರಿಗೆ',
    translit: 'saarige',
    en: 'Transport',
    category: 'travel',
  },
  {
    kn: 'ಮಹಾನಗರ',
    translit: 'mahanagara',
    en: 'Metropolitan',
    category: 'travel',
  },
  {
    kn: 'ಸಂಸ್ಥೆ',
    translit: 'samsthe',
    en: 'Corporation',
    category: 'travel',
  },
  {
    kn: 'ಉತ್ತರ',
    translit: 'uttara',
    en: 'North',
    category: 'travel',
    variants: ['ಉತ್ತರದ'],
  },
  {
    kn: 'ದಕ್ಷಿಣ',
    translit: 'dakshina',
    en: 'South',
    category: 'travel',
  },
  {
    kn: 'ಪೂರ್ವ',
    translit: 'poorva',
    en: 'East',
    category: 'travel',
  },
  {
    kn: 'ಪಶ್ಚಿಮ',
    translit: 'pashchima',
    en: 'West',
    category: 'travel',
  },

  // =========================================================================
  // 3. SIGNBOARDS, SHOPS & PUBLIC NOTICES
  // =========================================================================
  {
    kn: 'ತಳ್ಳಿ',
    translit: 'thalli',
    en: 'Push',
    category: 'sign',
    variants: ['ತಳ್ಳಿರಿ'],
  },
  {
    kn: 'ಎಳೆಯಿರಿ',
    translit: 'eleyiri',
    en: 'Pull',
    category: 'sign',
    variants: ['ಎಳೆ'],
  },
  {
    kn: 'ತೆರೆದಿದೆ',
    translit: 'theredide',
    en: 'Open',
    category: 'sign',
    variants: ['ತೆರೆದಿರುತ್ತದೆ'],
  },
  {
    kn: 'ಮುಚ್ಚಿದೆ',
    translit: 'muchchide',
    en: 'Closed',
    category: 'sign',
    variants: ['ಮುಚ್ಚಿರುತ್ತದೆ'],
  },
  {
    kn: 'ರಜೆ',
    translit: 'raje',
    en: 'Holiday',
    category: 'sign',
    variants: ['ರಜಾ'],
  },
  {
    kn: 'ಪಾರ್ಕಿಂಗ್',
    translit: 'parking',
    en: 'Parking',
    category: 'sign',
    variants: ['ಪಾರ್ಕಿಂಗ್‌', 'ವಾಹನ ನಿಲುಗಡೆ'],
  },
  {
    kn: 'ನಿಲುಗಡೆ',
    translit: 'nilugade',
    en: 'Parking / Halt',
    category: 'sign',
  },
  {
    kn: 'ನಿಷೇಧಿಸಲಾಗಿದೆ',
    translit: 'nishedhisalagide',
    en: 'Prohibited',
    category: 'sign',
    variants: ['ನಿಷೇಧ'],
  },
  {
    kn: 'ನಿಷೇಧ',
    translit: 'nishedha',
    en: 'Prohibited',
    category: 'sign',
  },
  {
    kn: 'ಧೂಮಪಾನ ನಿಷೇಧ',
    translit: 'dhoomapana nishedha',
    en: 'No Smoking',
    category: 'sign',
  },
  {
    kn: 'ಧೂಮಪಾನ',
    translit: 'dhoomapana',
    en: 'Smoking',
    category: 'sign',
  },
  {
    kn: 'ಮಾಡಬೇಡಿ',
    translit: 'maadabedi',
    en: 'Do Not',
    category: 'sign',
    variants: ['ಬೇಡಿ'],
  },
  {
    kn: 'ಅಪಾಯ',
    translit: 'apaaya',
    en: 'Danger',
    category: 'sign',
  },
  {
    kn: 'ಎಚ್ಚರಿಕೆ',
    translit: 'echcharike',
    en: 'Caution',
    category: 'sign',
  },
  {
    kn: 'ನಿಧಾನವಾಗಿ',
    translit: 'nidhanavagi',
    en: 'Drive Slowly',
    category: 'sign',
    variants: ['ನಿಧಾನ'],
  },
  {
    kn: 'ಚಲಿಸಿ',
    translit: 'chalisi',
    en: 'Move / Drive',
    category: 'sign',
  },
  {
    kn: 'ಶೌಚಾಲಯ',
    translit: 'shouchalaya',
    en: 'Restroom / Toilet',
    category: 'sign',
  },
  {
    kn: 'ಪುರುಷರು',
    translit: 'purusharu',
    en: 'Gents / Men',
    category: 'sign',
    variants: ['ಪುರುಷರ'],
  },
  {
    kn: 'ಮಹಿಳೆಯರು',
    translit: 'mahileyaru',
    en: 'Ladies / Women',
    category: 'sign',
  },
  {
    kn: 'ಕುಡಿಯುವ ನೀರು',
    translit: 'kudiyuva neeru',
    en: 'Drinking Water',
    category: 'sign',
  },
  {
    kn: 'ಕುಡಿಯುವ',
    translit: 'kudiyuva',
    en: 'Drinking',
    category: 'sign',
  },
  {
    kn: 'ಕೈ ತೊಳೆಯುವ ಸ್ಥಳ',
    translit: 'kai toleyuva sthala',
    en: 'Hand Wash',
    category: 'sign',
    variants: ['ಕೈ ತೊಳೆಯಿರಿ'],
  },
  {
    kn: 'ಕಸ',
    translit: 'kasa',
    en: 'Litter / Trash',
    category: 'sign',
    variants: ['ಕಸದ ಬುಟ್ಟಿ'],
  },
  {
    kn: 'ಹಾಕಬೇಡಿ',
    translit: 'haakabedi',
    en: 'Do Not Throw',
    category: 'sign',
  },
  {
    kn: 'ಸ್ವಚ್ಛತೆ',
    translit: 'swachchate',
    en: 'Cleanliness',
    category: 'sign',
    variants: ['ಸ್ವಚ್ಛ'],
  },
  {
    kn: 'ಕಾಪಾಡಿ',
    translit: 'kaapaadi',
    en: 'Maintain',
    category: 'sign',
  },
  {
    kn: 'ಚಪ್ಪಲಿ',
    translit: 'chappali',
    en: 'Footwear',
    category: 'sign',
    variants: ['ಪಾದರಕ್ಷೆ'],
  },
  {
    kn: 'ಬಿಡಿ',
    translit: 'bidi',
    en: 'Leave Here',
    category: 'sign',
  },
  {
    kn: 'ಮೌನ',
    translit: 'mouna',
    en: 'Silence',
    category: 'sign',
  },
  {
    kn: 'ಸಿಸಿಟಿವಿ',
    translit: 'cctv',
    en: 'CCTV Surveillance',
    category: 'sign',
  },
  {
    kn: 'ಕ್ಯಾಮೆರಾ',
    translit: 'camera',
    en: 'Camera',
    category: 'sign',
  },
  {
    kn: 'ಕಾವಲು',
    translit: 'kaavalu',
    en: 'Security',
    category: 'sign',
  },
  {
    kn: 'ನಾಯಿ',
    translit: 'naayi',
    en: 'Beware of Dog',
    category: 'sign',
    variants: ['ನಾಯಿಗಳಿವೆ ಎಚ್ಚರಿಕೆ'],
  },
  {
    kn: 'ಬಾಡಿಗೆಗೆ',
    translit: 'baadigege',
    en: 'To-Let / For Rent',
    category: 'sign',
    variants: ['ಬಾಡಿಗೆ', 'ಮನೆ ಬಾಡಿಗೆಗೆ ಇದೆ'],
  },
  {
    kn: 'ಮಾರಾಟಕ್ಕಿದೆ',
    translit: 'maaratakkide',
    en: 'For Sale',
    category: 'sign',
    variants: ['ಮಾರಾಟ'],
  },
  {
    kn: 'ಸಹಾಯವಾಣಿ',
    translit: 'sahaayavaani',
    en: 'Helpline',
    category: 'sign',
    variants: ['ಸಹಾಯ'],
  },
  {
    kn: 'ತುರ್ತು',
    translit: 'thurtu',
    en: 'Emergency',
    category: 'sign',
    variants: ['ತುರ್ತು ಚಿಕಿತ್ಸೆ'],
  },
  {
    kn: 'ಚಿಕಿತ್ಸೆ',
    translit: 'chikitse',
    en: 'Clinic / Treatment',
    category: 'sign',
    variants: ['ಚಿಕಿತ್ಸಾಲಯ'],
  },
  {
    kn: 'ಔಷಧಿ',
    translit: 'oushadhi',
    en: 'Pharmacy / Medicines',
    category: 'sign',
    variants: ['ಮೆಡಿಕಲ್ಸ್', 'ಔಷಧಾಲಯ'],
  },
  {
    kn: 'ಮಳಿಗೆ',
    translit: 'malige',
    en: 'Store / Showroom',
    category: 'sign',
  },
  {
    kn: 'ಕೇಂದ್ರ',
    translit: 'kendra',
    en: 'Center',
    category: 'sign',
  },
  {
    kn: 'ಕಚೇರಿ',
    translit: 'kacheri',
    en: 'Office',
    category: 'sign',
    variants: ['ಕಾರ್ಯಾಲಯ'],
  },
  {
    kn: 'ಬ್ಯಾಂಕ್',
    translit: 'bank',
    en: 'Bank',
    category: 'sign',
    variants: ['ಬ್ಯಾಂಕ್‌'],
  },
  {
    kn: 'ಎಟಿಎಂ',
    translit: 'atm',
    en: 'ATM',
    category: 'sign',
    variants: ['ಎ.ಟಿ.ಎಂ'],
  },
  {
    kn: 'ಅಂಚೆ ಕಚೇರಿ',
    translit: 'anche kacheri',
    en: 'Post Office',
    category: 'sign',
    variants: ['ಅಂಚೆ'],
  },
  {
    kn: 'ಮಹಡಿ',
    translit: 'mahadi',
    en: 'Floor',
    category: 'sign',
    variants: ['ನೆಲ ಮಹಡಿ', 'ಮೊದಲ ಮಹಡಿ'],
  },
  {
    kn: 'ಲಿಫ್ಟ್',
    translit: 'lift',
    en: 'Elevator / Lift',
    category: 'sign',
    variants: ['ಲಿಫ್ಟ್‌'],
  },
  {
    kn: 'ಮೆಟ್ಟಿಲು',
    translit: 'mettilu',
    en: 'Stairs',
    category: 'sign',
    variants: ['ಮೆಟ್ಟಿಲುಗಳು'],
  },
  {
    kn: 'ದಯವಿಟ್ಟು',
    translit: 'dayavittu',
    en: 'Please',
    category: 'sign',
  },
  {
    kn: 'ಸಹಕರಿಸಿ',
    translit: 'sahakarisi',
    en: 'Please Cooperate',
    category: 'sign',
  },
  {
    kn: 'ಸೂಚನೆ',
    translit: 'soochane',
    en: 'Notice',
    category: 'sign',
  },
  {
    kn: 'ಪ್ರಕಟಣೆ',
    translit: 'prakatane',
    en: 'Announcement',
    category: 'sign',
  },
  {
    kn: 'ಸ್ವಾಗತ',
    translit: 'swagata',
    en: 'Welcome',
    category: 'sign',
    variants: ['ಸುಸ್ವಾಗತ', 'ಹಾರ್ದಿಕ ಸ್ವಾಗತ'],
  },
  {
    kn: 'ಧನ್ಯವಾದಗಳು',
    translit: 'dhanyavadagalu',
    en: 'Thank You',
    category: 'sign',
    variants: ['ಧನ್ಯವಾದ'],
  },
  {
    kn: 'ಭೇಟಿ',
    translit: 'bheti',
    en: 'Visit',
    category: 'sign',
  },
  {
    kn: 'ಕೊಡಿ',
    translit: 'kodi',
    en: 'Pay / Give',
    category: 'sign',
  },
  {
    kn: 'ಸ್ವೀಕರಿಸಲಾಗುವುದು',
    translit: 'sweekarisalaguvudu',
    en: 'Accepted Here',
    category: 'sign',
  },
  {
    kn: 'ನಗದು',
    translit: 'nagadu',
    en: 'Cash',
    category: 'sign',
  },
  {
    kn: 'ಚಿಲ್ಲರೆ',
    translit: 'chillare',
    en: 'Loose Change',
    category: 'sign',
  },
  {
    kn: 'ಸಾಲು',
    translit: 'saalu',
    en: 'Queue',
    category: 'sign',
    variants: ['ಸಾಲಿನಲ್ಲಿ', 'ಸಾಲಿನಲ್ಲಿ ಬನ್ನಿ'],
  },

  // =========================================================================
  // 4. MONEY, RATES & EXACT KANNADA NUMERALS (FIX 2c)
  // =========================================================================
  {
    kn: 'ರೂಪಾಯಿ',
    translit: 'roopayi',
    en: 'Rupees (₹)',
    category: 'number',
    variants: ['ರೂಪಾಯಿಗಳು', 'ರೂ'],
  },
  {
    kn: 'ಬೆಲೆ',
    translit: 'bele',
    en: 'Price',
    category: 'number',
  },
  {
    kn: 'ದರಪಟ್ಟಿ',
    translit: 'darapatti',
    en: 'Price List / Tariff',
    category: 'number',
    variants: ['ದರ ಪಟ್ಟಿ'],
  },
  {
    kn: 'ದರ',
    translit: 'dara',
    en: 'Rate',
    category: 'number',
  },
  {
    kn: 'ಮಾತ್ರ',
    translit: 'maatra',
    en: 'Only',
    category: 'number',
  },
  {
    kn: 'ರಿಯಾಯಿತಿ',
    translit: 'riyayiti',
    en: 'Discount',
    category: 'number',
    variants: ['ಡಿಸ್ಕೌಂಟ್'],
  },
  {
    kn: 'ಉಚಿತ',
    translit: 'uchita',
    en: 'Free',
    category: 'number',
  },
  {
    kn: 'ಒಟ್ಟು',
    translit: 'ottu',
    en: 'Total',
    category: 'number',
  },
  {
    kn: 'ಅರ್ಧ',
    translit: 'ardha',
    en: 'Half (1/2)',
    category: 'number',
  },
  {
    kn: 'ಒಂದು',
    translit: 'ondu',
    en: '1 (One)',
    category: 'number',
    variants: ['೧'],
  },
  {
    kn: 'ಎರಡು',
    translit: 'eradu',
    en: '2 (Two)',
    category: 'number',
    variants: ['೨'],
  },
  {
    kn: 'ಮೂರು',
    translit: 'muru',
    en: '3 (Three)',
    category: 'number',
    variants: ['೩'],
  },
  {
    kn: 'ನಾಲ್ಕು',
    translit: 'nalku',
    en: '4 (Four)',
    category: 'number',
    variants: ['೪'],
  },
  {
    kn: 'ಐದು',
    translit: 'aidu',
    en: '5 (Five)',
    category: 'number',
    variants: ['೫'],
  },
  {
    kn: 'ಆರು',
    translit: 'aaru',
    en: '6 (Six)',
    category: 'number',
    variants: ['೬'],
  },
  {
    kn: 'ಏಳು',
    translit: 'elu',
    en: '7 (Seven)',
    category: 'number',
    variants: ['೭'],
  },
  {
    kn: 'ಎಂಟು',
    translit: 'entu',
    en: '8 (Eight)',
    category: 'number',
    variants: ['೮'],
  },
  {
    kn: 'ಒಂಬತ್ತು',
    translit: 'ombattu',
    en: '9 (Nine)',
    category: 'number',
    variants: ['೯'],
  },
  {
    kn: 'ಹತ್ತು',
    translit: 'hattu',
    en: '10 (Ten)',
    category: 'number',
    variants: ['೧೦'],
  },
  {
    kn: 'ಇಪ್ಪತ್ತು',
    translit: 'ippattu',
    en: '20 (Twenty)',
    category: 'number',
    variants: ['೨೦'],
  },
  {
    kn: 'ಮೂವತ್ತು',
    translit: 'muvattu',
    en: '30 (Thirty)',
    category: 'number',
    variants: ['೩೦'],
  },
  {
    kn: 'ನಲವತ್ತು',
    translit: 'nalavattu',
    en: '40 (Forty)',
    category: 'number',
    variants: ['೪೦'],
  },
  {
    kn: 'ಐವತ್ತು',
    translit: 'aivattu',
    en: '50 (Fifty)',
    category: 'number',
    variants: ['೫೦'],
  },
  {
    kn: 'ನೂರು',
    translit: 'nooru',
    en: '100 (Hundred)',
    category: 'number',
    variants: ['೧೦೦'],
  },

  // =========================================================================
  // 5. CIVIC, TEMPLE, RETAIL & EVERYDAY BENGALURU VOCABULARY
  // =========================================================================
  {
    kn: 'ನಮಸ್ಕಾರ',
    translit: 'namaskara',
    en: 'Namaskara (Hello)',
    category: 'common',
    variants: ['ನಮಸ್ಕಾರಗಳು'],
  },
  {
    kn: 'ಕನ್ನಡ',
    translit: 'kannada',
    en: 'Kannada',
    category: 'common',
  },
  {
    kn: 'ಕರ್ನಾಟಕ',
    translit: 'karnataka',
    en: 'Karnataka',
    category: 'common',
  },
  {
    kn: 'ಸರ್ಕಾರ',
    translit: 'sarkara',
    en: 'Government',
    category: 'common',
    variants: ['ಸರ್ಕಾರಿ', 'ಕರ್ನಾಟಕ ಸರ್ಕಾರ'],
  },
  {
    kn: 'ಪೊಲೀಸ್ ಠಾಣೆ',
    translit: 'police thane',
    en: 'Police Station',
    category: 'common',
  },
  {
    kn: 'ಪೊಲೀಸ್',
    translit: 'police',
    en: 'Police',
    category: 'common',
    variants: ['ಪೊಲೀಸ್‌', 'ಆರಕ್ಷಕ'],
  },
  {
    kn: 'ಠಾಣೆ',
    translit: 'thane',
    en: 'Police Station',
    category: 'common',
  },
  {
    kn: 'ಆಸ್ಪತ್ರೆ',
    translit: 'aaspatre',
    en: 'Hospital',
    category: 'common',
    variants: ['ಸರ್ಕಾರಿ ಆಸ್ಪತ್ರೆ'],
  },
  {
    kn: 'ಶಾಲೆ',
    translit: 'shaale',
    en: 'School',
    category: 'common',
  },
  {
    kn: 'ಕಾಲೇಜು',
    translit: 'kaaleju',
    en: 'College',
    category: 'common',
  },
  {
    kn: 'ವಿಶ್ವವಿದ್ಯಾಲಯ',
    translit: 'vishwavidyalaya',
    en: 'University',
    category: 'common',
  },
  {
    kn: 'ದೇವಸ್ಥಾನ',
    translit: 'devasthana',
    en: 'Temple',
    category: 'common',
    variants: ['ದೇವಾಲಯ'],
  },
  {
    kn: 'ದೇವಾಲಯ',
    translit: 'devalaya',
    en: 'Temple',
    category: 'common',
  },
  {
    kn: 'ಪೂಜೆ',
    translit: 'pooje',
    en: 'Pooja / Worship',
    category: 'common',
  },
  {
    kn: 'ಪ್ರಸಾದ',
    translit: 'prasada',
    en: 'Prasada',
    category: 'common',
    variants: ['ತೀರ್ಥ ಪ್ರಸಾದ'],
  },
  {
    kn: 'ಅನ್ನದಾನ',
    translit: 'annadana',
    en: 'Free Temple Meals',
    category: 'common',
  },
  {
    kn: 'ದರ್ಶನ',
    translit: 'darshana',
    en: 'Darshana',
    category: 'common',
  },
  {
    kn: 'ಅಂಗಡಿ',
    translit: 'angadi',
    en: 'Shop',
    category: 'common',
  },
  {
    kn: 'ತರಕಾರಿ',
    translit: 'tarakari',
    en: 'Vegetables',
    category: 'common',
    variants: ['ತರಕಾರಿಗಳು'],
  },
  {
    kn: 'ಹೂವು',
    translit: 'hoovu',
    en: 'Flowers',
    category: 'common',
    variants: ['ಹೂವಿನ ಅಂಗಡಿ'],
  },
  {
    kn: 'ಪುಸ್ತಕ',
    translit: 'pustaka',
    en: 'Books',
    category: 'common',
    variants: ['ಪುಸ್ತಕ ಮಳಿಗೆ'],
  },
  {
    kn: 'ಬಟ್ಟೆ',
    translit: 'batte',
    en: 'Clothing / Textiles',
    category: 'common',
  },
  {
    kn: 'ಚಿನ್ನ',
    translit: 'chinna',
    en: 'Gold & Jewellery',
    category: 'common',
    variants: ['ಆಭರಣ'],
  },
  {
    kn: 'ಉದ್ಯಾನವನ',
    translit: 'udyanavana',
    en: 'Public Park',
    category: 'common',
    variants: ['ಪಾರ್ಕ್'],
  },
  {
    kn: 'ಗ್ರಂಥಾಲಯ',
    translit: 'granthalaya',
    en: 'Library',
    category: 'common',
  },
  {
    kn: 'ನ್ಯಾಯಾಲಯ',
    translit: 'nyayalaya',
    en: 'Court',
    category: 'common',
  },
  {
    kn: 'ವಿದ್ಯುತ್',
    translit: 'vidyut',
    en: 'Electricity (BESCOM)',
    category: 'common',
    variants: ['ವಿದ್ಯುತ್‌'],
  },
  {
    kn: 'ಜಲಮಂಡಳಿ',
    translit: 'jalamandali',
    en: 'Water Board (BWSSB)',
    category: 'common',
  },
  {
    kn: 'ಮಂಡಳಿ',
    translit: 'mandali',
    en: 'Board',
    category: 'common',
  },
  {
    kn: 'ಪಾಲಿಕೆ',
    translit: 'paalike',
    en: 'City Corporation (BBMP)',
    category: 'common',
    variants: ['ಮಹಾನಗರ ಪಾಲಿಕೆ'],
  },
  {
    kn: 'ನಗರ',
    translit: 'nagara',
    en: 'Nagar',
    category: 'common',
  },
  {
    kn: 'ಬಡಾವಣೆ',
    translit: 'badavane',
    en: 'Layout',
    category: 'common',
  },
  {
    kn: 'ಹಂತ',
    translit: 'hanta',
    en: 'Phase / Stage',
    category: 'common',
  },
  {
    kn: 'ಬ್ಲಾಕ್',
    translit: 'block',
    en: 'Block',
    category: 'common',
    variants: ['ಬ್ಲಾಕ್‌'],
  },
  {
    kn: 'ಇಂದು',
    translit: 'indu',
    en: 'Today',
    category: 'common',
    variants: ['ಇವತ್ತು'],
  },
  {
    kn: 'ನಾಳೆ',
    translit: 'naale',
    en: 'Tomorrow',
    category: 'common',
  },
  {
    kn: 'ಬೆಳಿಗ್ಗೆ',
    translit: 'beligge',
    en: 'Morning',
    category: 'common',
  },
  {
    kn: 'ಮಧ್ಯಾಹ್ನ',
    translit: 'madhyahna',
    en: 'Afternoon',
    category: 'common',
  },
  {
    kn: 'ಸಂಜೆ',
    translit: 'sanje',
    en: 'Evening',
    category: 'common',
  },
  {
    kn: 'ರಾತ್ರಿ',
    translit: 'raatri',
    en: 'Night',
    category: 'common',
  },
  {
    kn: 'ಗಂಟೆ',
    translit: 'gante',
    en: 'Hour / O’Clock',
    category: 'common',
  },
  {
    kn: 'ದಿನ',
    translit: 'dina',
    en: 'Daily',
    category: 'common',
    variants: ['ಪ್ರತಿದಿನ'],
  },
  {
    kn: 'ಭಾನುವಾರ',
    translit: 'bhanuvara',
    en: 'Sunday',
    category: 'common',
  },
  {
    kn: 'ಸೋಮವಾರ',
    translit: 'somavara',
    en: 'Monday',
    category: 'common',
  },
  {
    kn: 'ಮಂಗಳವಾರ',
    translit: 'mangalavara',
    en: 'Tuesday',
    category: 'common',
  },
  {
    kn: 'ಬುಧವಾರ',
    translit: 'budhavara',
    en: 'Wednesday',
    category: 'common',
  },
  {
    kn: 'ಗುರುವಾರ',
    translit: 'guruvara',
    en: 'Thursday',
    category: 'common',
  },
  {
    kn: 'ಶುಕ್ರವಾರ',
    translit: 'shukravara',
    en: 'Friday',
    category: 'common',
  },
  {
    kn: 'ಶನಿವಾರ',
    translit: 'shanivara',
    en: 'Saturday',
    category: 'common',
  },
  {
    kn: 'ಎಷ್ಟು',
    translit: 'eshtu',
    en: 'How Much',
    category: 'common',
  },
  {
    kn: 'ಇಲ್ಲ',
    translit: 'illa',
    en: 'Not Available',
    category: 'common',
  },
  {
    kn: 'ಸಿಗುತ್ತದೆ',
    translit: 'siguttade',
    en: 'Available Here',
    category: 'common',
    variants: ['ದೊರೆಯುತ್ತದೆ'],
  },
  {
    kn: 'ದೊರೆಯುತ್ತದೆ',
    translit: 'doreyuttade',
    en: 'Available Here',
    category: 'common',
  },
  {
    kn: 'ಬೇಕು',
    translit: 'beku',
    en: 'Wanted / Needed',
    category: 'common',
  },
  {
    kn: 'ಬೇಡ',
    translit: 'beda',
    en: 'No / Do Not',
    category: 'common',
  },
  {
    kn: 'ಚೆನ್ನಾಗಿದೆ',
    translit: 'chennagide',
    en: 'Very Good',
    category: 'common',
  },
  {
    kn: 'ದೊಡ್ಡ',
    translit: 'dodda',
    en: 'Large / Full',
    category: 'common',
  },
  {
    kn: 'ಚಿಕ್ಕ',
    translit: 'chikka',
    en: 'Small / Mini',
    category: 'common',
  },
  {
    kn: 'ಹೊಸ',
    translit: 'hosa',
    en: 'New',
    category: 'common',
  },
  {
    kn: 'ಹಳೆಯ',
    translit: 'haleya',
    en: 'Old',
    category: 'common',
  },
  {
    kn: 'ಸೇವೆ',
    translit: 'seve',
    en: 'Service',
    category: 'common',
  },
  {
    kn: 'ಮಾಹಿತಿ',
    translit: 'maahiti',
    en: 'Information',
    category: 'common',
  },
  {
    kn: 'ಸಾರ್ವಜನಿಕ',
    translit: 'saarvajanika',
    en: 'Public',
    category: 'common',
  },
  {
    kn: 'ಖಾಸಗಿ',
    translit: 'khaasagi',
    en: 'Private',
    category: 'common',
  },
  {
    kn: 'ಉತ್ತಮ',
    translit: 'uttama',
    en: 'Best / Quality',
    category: 'common',
  },
  {
    kn: 'ರುಚಿಯಾದ',
    translit: 'ruchiyada',
    en: 'Delicious / Tasty',
    category: 'common',
    variants: ['ರುಚಿ', 'ಶುಚಿ ಮತ್ತು ರುಚಿ'],
  },
  {
    kn: 'ಶುಚಿ',
    translit: 'shuchi',
    en: 'Clean & Hygienic',
    category: 'common',
  },
  {
    kn: 'ತಾಜಾ',
    translit: 'taaja',
    en: 'Fresh',
    category: 'common',
  },
  {
    kn: 'ಸಂಪರ್ಕಿಸಿ',
    translit: 'samparkisi',
    en: 'Contact Us',
    category: 'common',
  },
  {
    kn: 'ವಿತರಣೆ',
    translit: 'vitarane',
    en: 'Home Delivery',
    category: 'common',
  },
  {
    kn: 'ಶಾಖೆ',
    translit: 'shaakhe',
    en: 'Branch',
    category: 'common',
  },
];

/**
 * Normalizes a surface token from OCR (Kannada or English):
 * - NFC-normalized
 * - Strips punctuation, zero-width joiners, and ASCII digits
 * - Preserves Kannada letters, vowel signs, Kannada numerals (\u0CE6-\u0CEF), and Latin letters
 */
export function normalizeKannadaSurface(raw: string): string {
  if (!raw) return '';
  const cleaned = normalize(raw)
    // Remove ASCII digits and noisy symbols while keeping Kannada (\u0C80-\u0CFF) and Latin (a-z)
    .replace(/[^\u0C80-\u0CFFa-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';

  // Drop stopwords immediately (FIX 2b)
  if (STOPWORDS.has(cleaned)) return '';

  // Allow exact Kannada numerals (\u0CE6-\u0CEF) even if 1 char
  if (KANNADA_NUMERAL_ONLY_REGEX.test(cleaned)) {
    return EXACT_ONLY_NUMBER_TOKENS.has(cleaned) ? cleaned : '';
  }

  // If Kannada script, require at least one base vowel/consonant (\u0C85-\u0CB9) and length >= 2
  if (KANNADA_SCRIPT_REGEX.test(cleaned)) {
    const knOnly = cleaned.replace(/[^\u0C82-\u0CD6\s]/g, '').trim();
    if (!/[\u0C85-\u0CB9]/.test(knOnly) || knOnly.length < 2) {
      return '';
    }
    return knOnly;
  }

  // If Latin/English script, require length >= 4 and not in STOPWORDS or BLOCKED_ENGLISH_TRANSLIT
  const latinOnly = normalizeLatin(cleaned).replace(/[^a-z\s]/g, '').trim();
  if (
    latinOnly.length < 4 ||
    STOPWORDS.has(latinOnly) ||
    BLOCKED_ENGLISH_TRANSLIT.has(latinOnly)
  ) {
    return '';
  }

  return latinOnly;
}

/**
 * Light matra-collapsing normalization for Kannada so Tesseract vowel-length
 * or halant glitches (e.g. "ವಡ" vs "ವಡೆ", "ಚಿತ್ರನ್ನ" vs "ಚಿತ್ರಾನ್ನ") can be
 * scored with shared Levenshtein similarity.
 */
function normalizeKannadaMatraLight(str: string): string {
  return str
    .normalize('NFC')
    .replace(/\s+/g, '')
    .replace(/ಾ/g, '')
    .replace(/ೀ/g, 'ಿ')
    .replace(/ೂ/g, 'ು')
    .replace(/ೇ/g, 'ೆ')
    .replace(/ೋ/g, 'ೊ')
    .replace(/್$/g, '');
}

/**
 * Computes fuzzy similarity between a Kannada OCR token and a Kannada lexicon form
 * using the shared Levenshtein `similarity()` function from `lib/shared/matcher.ts`.
 */
function scoreKannadaSimilarity(ocrKn: string, targetKn: string): number {
  const a = ocrKn.normalize('NFC').replace(/\s+/g, '');
  const b = targetKn.normalize('NFC').replace(/\s+/g, '');
  if (!a || !b) return 0;
  if (a === b) return 1.0;

  const directSim = similarity(a, b);

  // Also check matra-normalized Levenshtein similarity (slightly discounted by 0.94 so exact matras win)
  const matraA = normalizeKannadaMatraLight(a);
  const matraB = normalizeKannadaMatraLight(b);
  const matraSim =
    matraA.length >= 2 && matraB.length >= 2
      ? similarity(matraA, matraB) * 0.94
      : 0;

  return Math.max(directSim, matraSim);
}

/**
 * Core single-word / phrase fuzzy matcher returning both the matched LexiconEntry and its similarity score.
 * Implements FIX 1 (thresholds 0.78 Kannada, 0.85 short Kannada <= 4 chars, 0.88 English >= 4 chars)
 * and FIX 2 (stopwords, no generic English words, exact-only numbers).
 */
export function matchWordWithScore(
  rawWord: string,
  options?: { multiWordOnly?: boolean }
): { entry: LexiconEntry; score: number } | null {
  const cleaned = normalizeKannadaSurface(rawWord);
  if (!cleaned) return null;

  // FIX 2c: Kannada numerals and digit words match ONLY on exact match
  if (
    KANNADA_NUMERAL_ONLY_REGEX.test(cleaned) ||
    EXACT_ONLY_NUMBER_TOKENS.has(cleaned)
  ) {
    if (options?.multiWordOnly) return null;
    for (const entry of LEXICON) {
      if (entry.category !== 'number') continue;
      const forms = [entry.kn, ...(entry.variants ?? [])];
      if (forms.some((f) => f.normalize('NFC').trim() === cleaned)) {
        return { entry, score: 1.0 };
      }
    }
    return null;
  }

  const isKannada = KANNADA_SCRIPT_REGEX.test(cleaned);

  if (isKannada) {
    const spaceless = cleaned.replace(/\s+/g, '');
    // FIX 1b & 1c: Short Kannada words (<= 4 chars) require >= 0.85; longer words require >= 0.78
    const threshold = spaceless.length <= 4 ? 0.85 : 0.78;

    let bestEntry: LexiconEntry | null = null;
    let bestScore = 0;

    for (const entry of LEXICON) {
      if (
        entry.category === 'number' &&
        EXACT_ONLY_NUMBER_TOKENS.has(entry.kn)
      ) {
        continue;
      }

      if (options?.multiWordOnly) {
        const isCompound =
          entry.kn.includes(' ') ||
          entry.translit.includes(' ') ||
          (entry.variants?.some((v) => v.includes(' ')) ?? false);
        if (!isCompound) continue;
      }

      const forms = [entry.kn, ...(entry.variants ?? [])];
      for (const form of forms) {
        const normForm = form.normalize('NFC').trim();
        if (!normForm || KANNADA_NUMERAL_ONLY_REGEX.test(normForm)) continue;

        const score = scoreKannadaSimilarity(cleaned, normForm);
        if (score >= threshold && score > bestScore) {
          bestScore = score;
          bestEntry = entry;
          if (score === 1.0) break;
        }
      }
    }

    if (bestEntry && bestScore >= threshold) {
      return {
        entry: bestEntry,
        score: Math.round(bestScore * 100) / 100,
      };
    }

    return null;
  }

  // English-script match against translit field ONLY (FIX 1b & FIX 2a):
  // threshold >= 0.88 AND translit length >= 4 chars
  const normEng = normalizeLatin(cleaned);
  if (
    normEng.length < 4 ||
    STOPWORDS.has(normEng) ||
    BLOCKED_ENGLISH_TRANSLIT.has(normEng)
  ) {
    return null;
  }

  const engThreshold = 0.88;
  let bestEngEntry: LexiconEntry | null = null;
  let bestEngScore = 0;

  for (const entry of LEXICON) {
    if (entry.category === 'number') continue;

    const targetTranslit = normalizeLatin(entry.translit);
    if (
      targetTranslit.length < 4 ||
      STOPWORDS.has(targetTranslit) ||
      BLOCKED_ENGLISH_TRANSLIT.has(targetTranslit)
    ) {
      continue;
    }

    if (options?.multiWordOnly && !targetTranslit.includes(' ')) {
      continue;
    }

    const score = similarity(normEng, targetTranslit);
    if (score >= engThreshold && score > bestEngScore) {
      bestEngScore = score;
      bestEngEntry = entry;
      if (score === 1.0) break;
    }
  }

  if (bestEngEntry && bestEngScore >= engThreshold) {
    return {
      entry: bestEngEntry,
      score: Math.round(bestEngScore * 100) / 100,
    };
  }

  return null;
}

export function matchSingleOcrWord(rawWord: string): LexiconEntry | null {
  return matchWordWithScore(rawWord)?.entry ?? null;
}

export function matchCompoundOcrPhrase(words: string[]): LexiconEntry | null {
  if (!Array.isArray(words) || words.length < 2) return null;
  const joined = words.map((w) => w.trim()).filter(Boolean).join(' ');
  return matchWordWithScore(joined, { multiWordOnly: true })?.entry ?? null;
}

/**
 * FIX 1b: Rewritten findMatches() using shared Levenshtein similarity.
 * Returns best-scoring lexicon entry per OCR word along with its similarity score.
 */
export function findMatches(ocrWords: string[]): LexiconMatchResult[] {
  if (!Array.isArray(ocrWords) || ocrWords.length === 0) return [];

  const results: LexiconMatchResult[] = [];
  const seenWords = new Set<string>();

  for (const raw of ocrWords) {
    if (typeof raw !== 'string') continue;
    const cleaned = normalizeKannadaSurface(raw);
    if (!cleaned || seenWords.has(cleaned)) continue;

    const hit = matchWordWithScore(cleaned);
    if (hit) {
      seenWords.add(cleaned);
      results.push({
        word: cleaned,
        entry: hit.entry,
        score: hit.score,
      });
    }
  }

  return results;
}

/**
 * FIX 3 (Phrase / N-Gram Matching) & FIX 8 (Merge Split Boxes):
 * 1. Groups OCR words into horizontal lines (vertical centers within 40% of average line height, sorted by x0).
 * 2. Slides 3-word and 2-word windows across each line to match multi-word phrases (merging bboxes and marking constituent words consumed).
 * 3. For adjacent unconsumed Kannada words on the same line with horizontal gap < 35% of average box height whose individual matches both fail, tries matching their joined string (>= 0.78) and merges them if matched.
 */
export function matchOcrWordsInLines(
  rawWords: OcrWord[]
): LineMatchedOcrItem[] {
  if (!Array.isArray(rawWords) || rawWords.length === 0) return [];

  // Filter out stopwords and non-word punctuation noise first
  const validTokens = rawWords
    .map((w) => ({
      word: w,
      cleaned: normalizeKannadaSurface(w.text),
    }))
    .filter((t) => t.cleaned.length > 0);

  if (validTokens.length === 0) return [];

  // Compute global average box height
  const totalHeight = validTokens.reduce(
    (sum, t) => sum + Math.max(1, t.word.bbox.y1 - t.word.bbox.y0),
    0
  );
  const globalAvgH = totalHeight / validTokens.length;

  // Sort by vertical center first to group into lines
  const sortedByY = [...validTokens].sort((a, b) => {
    const cyA = (a.word.bbox.y0 + a.word.bbox.y1) / 2;
    const cyB = (b.word.bbox.y0 + b.word.bbox.y1) / 2;
    return cyA - cyB;
  });

  type TokenWithCleanup = (typeof validTokens)[number];
  const lines: TokenWithCleanup[][] = [];

  for (const tok of sortedByY) {
    const cy = (tok.word.bbox.y0 + tok.word.bbox.y1) / 2;
    const h = Math.max(1, tok.word.bbox.y1 - tok.word.bbox.y0);

    let placedLine: TokenWithCleanup[] | null = null;
    for (const line of lines) {
      const lineCy =
        line.reduce(
          (s, item) => s + (item.word.bbox.y0 + item.word.bbox.y1) / 2,
          0
        ) / line.length;
      const lineAvgH =
        line.reduce(
          (s, item) => s + Math.max(1, item.word.bbox.y1 - item.word.bbox.y0),
          0
        ) / line.length;
      const refH = (lineAvgH + h + globalAvgH) / 3;

      // FIX 3a: vertical centers within 40% of average line height
      if (Math.abs(cy - lineCy) <= refH * 0.4) {
        placedLine = line;
        break;
      }
    }

    if (placedLine) {
      placedLine.push(tok);
    } else {
      lines.push([tok]);
    }
  }

  const output: LineMatchedOcrItem[] = [];

  // Process each line sorted left-to-right by x0
  for (const line of lines) {
    line.sort((a, b) => a.word.bbox.x0 - b.word.bbox.x0);

    const n = line.length;
    const consumed = new Set<number>();

    const canConnectHorizontally = (
      a: TokenWithCleanup,
      b: TokenWithCleanup
    ): boolean => {
      const hA = Math.max(1, a.word.bbox.y1 - a.word.bbox.y0);
      const hB = Math.max(1, b.word.bbox.y1 - b.word.bbox.y0);
      const avgH = (hA + hB) / 2;
      const gap = b.word.bbox.x0 - a.word.bbox.x1;
      // Never merge across a large horizontal gap (> 1.5x average word height)
      return gap >= -avgH * 0.5 && gap <= avgH * 1.5;
    };

    // Pass 1 — FIX 3b: Slide window of 3 and 2 consecutive words on the line
    for (let i = 0; i < n; i++) {
      if (consumed.has(i)) continue;

      // Try 3-gram phrase
      if (
        i + 2 < n &&
        !consumed.has(i + 1) &&
        !consumed.has(i + 2) &&
        canConnectHorizontally(line[i], line[i + 1]) &&
        canConnectHorizontally(line[i + 1], line[i + 2])
      ) {
        const slice3 = [line[i], line[i + 1], line[i + 2]];
        const joined3 = slice3.map((t) => t.cleaned).join(' ');
        const match3 = matchWordWithScore(joined3, { multiWordOnly: true });
        if (match3) {
          consumed.add(i);
          consumed.add(i + 1);
          consumed.add(i + 2);
          output.push(buildMergedLineItem(slice3, match3.entry, match3.score, true));
          continue;
        }
      }

      // Try 2-gram phrase
      if (
        i + 1 < n &&
        !consumed.has(i + 1) &&
        canConnectHorizontally(line[i], line[i + 1])
      ) {
        const slice2 = [line[i], line[i + 1]];
        const joined2 = slice2.map((t) => t.cleaned).join(' ');
        const match2 = matchWordWithScore(joined2, { multiWordOnly: true });
        if (match2) {
          consumed.add(i);
          consumed.add(i + 1);
          output.push(buildMergedLineItem(slice2, match2.entry, match2.score, true));
          continue;
        }
      }
    }

    // Pass 2 — FIX 8: Merge Split Boxes (when two adjacent Kannada words have gap < 35% of avg height AND both fail individual match)
    for (let i = 0; i < n; i++) {
      if (consumed.has(i)) continue;

      const curr = line[i];
      const currHit = matchWordWithScore(curr.cleaned);

      if (
        !currHit &&
        i + 1 < n &&
        !consumed.has(i + 1) &&
        KANNADA_SCRIPT_REGEX.test(curr.cleaned) &&
        KANNADA_SCRIPT_REGEX.test(line[i + 1].cleaned)
      ) {
        const next = line[i + 1];
        const nextHit = matchWordWithScore(next.cleaned);

        if (!nextHit) {
          const hA = Math.max(1, curr.word.bbox.y1 - curr.word.bbox.y0);
          const hB = Math.max(1, next.word.bbox.y1 - next.word.bbox.y0);
          const avgH = (hA + hB) / 2;
          const gap = next.word.bbox.x0 - curr.word.bbox.x1;

          // Gap < 35% of average box height (and not overlapping wildly)
          if (gap >= -avgH * 0.4 && gap < avgH * 0.35) {
            const joinedNoSpace = `${curr.cleaned}${next.cleaned}`;
            const joinedHit =
              matchWordWithScore(joinedNoSpace) ||
              matchWordWithScore(`${curr.cleaned} ${next.cleaned}`);

            if (joinedHit && joinedHit.score >= 0.78) {
              consumed.add(i);
              consumed.add(i + 1);
              output.push(
                buildMergedLineItem(
                  [curr, next],
                  joinedHit.entry,
                  joinedHit.score,
                  true
                )
              );
              continue;
            }
          }
        }
      }

      consumed.add(i);
      output.push(
        buildMergedLineItem(
          [curr],
          currHit?.entry ?? null,
          currHit?.score ?? 0,
          false
        )
      );
    }
  }

  return output;
}

function buildMergedLineItem(
  tokens: Array<{ word: OcrWord; cleaned: string }>,
  entry: LexiconEntry | null,
  score: number,
  isMerged: boolean
): LineMatchedOcrItem {
  const x0 = Math.min(...tokens.map((t) => t.word.bbox.x0));
  const y0 = Math.min(...tokens.map((t) => t.word.bbox.y0));
  const x1 = Math.max(...tokens.map((t) => t.word.bbox.x1));
  const y1 = Math.max(...tokens.map((t) => t.word.bbox.y1));

  const avgConf =
    tokens.reduce((s, t) => s + t.word.confidence, 0) / tokens.length;

  return {
    rawText: tokens.map((t) => t.word.text).join(' '),
    cleanText: tokens.map((t) => t.cleaned).join(' '),
    confidence: avgConf + (isMerged && entry ? 15 : 0),
    bbox: { x0, y0, x1, y1 },
    entry,
    score,
  };
}
