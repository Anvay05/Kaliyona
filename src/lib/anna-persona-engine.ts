import type { ScenarioCard, PersonaBrainItem } from '../data/scenarios';
import type { AnnaChatTurn, AnnaMood } from '../voice/anna-brain';
import { getKaliyonaPrefs } from './kaliyona-prefs';

export interface PersonaReply {
  script: string;
  kanglish: string;
  english: string;
  mood?: AnnaMood;
}

// =========================================================================
// PART A — NORMALIZE + NEGATION DETECTION
// =========================================================================

/**
 * Normalizes user text for matching:
 * Lowercases, collapses whitespace, removes special symbols except sentence/clause splits.
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0C80-\u0CFF,.;!?'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detects whether text contains standalone negation words or phrases:
 * 'not', "n't" (don't/won't/can't/no need), 'no ', 'nothing',
 * 'beda', 'beda!', 'venda', 'bekagilla', 'illa' (bare illa = no/don't),
 * 'cancel', 'stop', 'dont', 'dont want'
 */
export function detectNegation(text: string): boolean {
  if (!text) return false;
  const t = ` ${text.toLowerCase()} `;

  // Exclude non-refusal phrases that contain words like "stop", "no", "not", "don't"
  const stripped = t
    .replace(
      /\b(bus\s+stop|next\s+stop|which\s+stop|my\s+stop|this\s+stop|stop\s+here|stop\s+near|stop\s+at|stop\s+by|please\s+stop|auto\s+stop)\b/gi,
      ' '
    )
    .replace(
      /\b(no\s+sugar|less\s+sugar|without\s+sugar|no\s+spice|not\s+spicy|less\s+spicy|no\s+onion|no\s+garlic|no\s+ice|no\s+change|don'?t\s+have\s+change|no\s+problem|no\s+worries|no\s+issue|don'?t\s+know|do\s+not\s+know|don'?t\s+understand|not\s+sure)\b/gi,
      ' '
    );

  // Standalone refusal word checks
  if (
    /\b(no\s+need|no\s+thanks|no\s+thank\s+you|nothing|beda|venda|bekagilla|illa\s+beda|cancel|dont\s+want|don't\s+want|do\s+not\s+want|i\s+don't\s+need|dont\s+need)\b/i.test(
      stripped
    ) ||
    /^\s*(no|illa|beda|not\s+needed)\s*[.!?]*\s*$/i.test(stripped)
  ) {
    return true;
  }
  return false;
}

// Module-level rotation store for round-robin persona negation lines (never repeats last)
const personaNegationRotation: Record<string, number> = {};

// Module-level rotation for English-only tips (rotate 3 variants, never stack)
let englishTipIndex = 0;
const ENGLISH_TIPS = [
  " (Tip: try 'eshtu?' for price)",
  " (Tip: say '...beku' to ask)",
  " (Tip: say 'namaskara' to greet)",
];

/**
 * Check if the text is purely English (contains no Kannada characters and no Kanglish tokens)
 */
function isEnglishOnlyText(raw: string): boolean {
  // If text has Kannada script characters
  if (/[\u0C80-\u0CFF]/.test(raw)) return false;

  const words = raw.toLowerCase().split(/\s+/);
  const commonKanglishTokens = new Set([
    'namaskara',
    'namaste',
    'hegiddira',
    'hegiddiya',
    'beku',
    'kodi',
    'illa',
    'beda',
    'eshtu',
    'elli',
    'hogbeku',
    'sari',
    'haudhu',
    'haudu',
    'guru',
    'anna',
    'boss',
    'thindi',
    'oota',
    'dose',
    'dosa',
    'idli',
    'kaapi',
    'neeru',
    'baadige',
    'duddu',
    'banni',
    'togoLLi',
    'kammi',
    'jaasti',
    'chennagi',
  ]);

  for (const w of words) {
    const cleanWord = w.replace(/[^\w]/g, '');
    if (commonKanglishTokens.has(cleanWord)) {
      return false;
    }
  }

  return true;
}

// =========================================================================
// SCRIPT & TRANSLATION DICTIONARY FOR FIXED PERSONA STRINGS
// =========================================================================

interface LineInfo {
  script: string;
  english: string;
}

const LINE_TRANSLATIONS: Record<string, LineInfo> = {
  // Darshini / Waiter Negation Lines
  'Sari sir, bejaar madbedi! Innu enu beku — idli? dose?': {
    script: 'ಸರಿ ಸರ್, ಬೇಜಾರ್ ಮಾಡ್ಬೇಡಿ! ಇನ್ನು ಏನು ಬೇಕು — ಇಡ್ಲಿ? ದೋಸೆ?',
    english: "Alright sir, don't worry! What else do you want — idli? dosa?",
  },
  'Kalsabeda! Freshaagi banni yavaga beku aaga.': {
    script: 'ಕಳಸಬೇಡ! ಫ್ರೆಶ್ ಆಗಿ ಬನ್ನಿ ಯಾವಾಗ ಬೇಕು ಆಗ.',
    english: 'No problem! Come fresh whenever you want.',
  },
  'Okay boss! Bere enadru try maadi — vada chennagirutte!': {
    script: 'ಓಕೆ ಬಾಸ್! ಬೇರೆ ಏನಾದ್ರೂ ಟ್ರೈ ಮಾಡಿ — ವಡೆ ಚೆನ್ನಾಗಿರುತ್ತೆ!',
    english: 'Okay boss! Try something else — vada is very good!',
  },
  'Illa parvagilla sir! Neevu sumne koothkoli, heng?': {
    script: 'ಇಲ್ಲ ಪರವಾಗಿಲ್ಲ ಸರ್! ನೀವು ಸುಮ್ನೆ ಕೂತ್ಕೊಳ್ಳಿ, ಹೆಂಗ್?',
    english: 'No problem sir! You just relax and sit, how about that?',
  },
  'Sari sari! Coffee illa andre tea idde sir?': {
    script: 'ಸರಿ ಸರಿ! ಕಾಫಿ ಇಲ್ಲ ಅಂದ್ರೆ ಟೀ ಇದೆ ಸರ್?',
    english: 'Alright! If not coffee, tea is available sir?',
  },
  // Darshini Affirms & Fallbacks
  'Sari boss, eradu nimisha!': {
    script: 'ಸರಿ ಬಾಸ್, ಎರಡು ನಿಮಿಷ!',
    english: 'Alright boss, two minutes!',
  },
  'Haudhu sir, bring madtini!': {
    script: 'ಹೌದು ಸರ್, ಬ್ರಿಂಗ್ ಮಾಡ್ತೀನಿ!',
    english: 'Yes sir, bringing it right away!',
  },
  'Bisi idli ₹30, masala dose ₹50, filter coffee ₹20 ready ide sir — enu kodli?': {
    script: 'ಬಿಸಿ ಇಡ್ಲಿ ₹30, ಮಸಾಲ ದೋಸೆ ₹50, ಫಿಲ್ಟರ್ ಕಾಫಿ ₹20 ರೆಡಿ ಇದೆ ಸರ್ — ಏನು ಕೊಡ್ಲಿ?',
    english: 'Hot idli ₹30, masala dosa ₹50, filter coffee ₹20 are ready sir — what can I get you?',
  },

  // Auto Negations
  'Sari saar, beda andre bidi! Yavaga beku aaga call maadi.': {
    script: 'ಸರಿ ಸಾರ್, ಬೇಡ ಅಂದ್ರೆ ಬಿಡಿ! ಯಾವಾಗ ಬೇಕು ಆಗ ಕಾಲ್ ಮಾಡಿ.',
    english: 'Alright sir, if you don’t want leave it! Call whenever you need.',
  },
  'Aaytu sir, hogalla andre parvagilla. Naanu bere ride nodtini!': {
    script: 'ಆಯ್ತು ಸರ್, ಹೋಗಲ್ಲ ಅಂದ್ರೆ ಪರವಾಗಿಲ್ಲ. ನಾನು ಬೇರೆ ರೈಡ್ ನೋಡ್ತೀನಿ!',
    english: 'Okay sir, no problem if not going. I will look for another ride!',
  },
  'Illa sir, tension madkolbedi! Stand alliye irthini.': {
    script: 'ಇಲ್ಲ ಸರ್, ಟೆನ್ಷನ್ ಮಾಡ್ಕೊಳ್ಬೇಡಿ! ಸ್ಟ್ಯಾಂಡ್ ಅಲ್ಲೇ ಇರ್ತೀನಿ.',
    english: 'No sir, don’t take tension! I will be at the stand.',
  },
  'Sari boss, drop plan cancel! Matte yavagaadru hogona.': {
    script: 'ಸರಿ ಬಾಸ್, ಡ್ರಾಪ್ ಪ್ಲಾನ್ ಕ್ಯಾನ್ಸಲ್! ಮತ್ತೆ ಯಾವಾಗಾದ್ರೂ ಹೋಗೋಣ.',
    english: 'Alright boss, drop plan cancelled! Let’s go some other time.',
  },
  // Auto Affirms & Fallbacks
  'Sari saar, kootkoLLi! Meter haaki hogona.': {
    script: 'ಸರಿ ಸಾರ್, ಕೂತ್ಕೊಳ್ಳಿ! ಮೀಟರ್ ಹಾಕಿ ಹೋಗೋಣ.',
    english: 'Alright sir, please sit! We will go on meter.',
  },
  'Haudhu boss, bega banni, traffic jaasti aagutte!': {
    script: 'ಹೌದು ಬಾಸ್, ಬೇಗ ಬನ್ನಿ, ಟ್ರಾಫಿಕ್ ಜಾಸ್ತಿ ಆಗುತ್ತೆ!',
    english: 'Yes boss, come quickly, traffic will increase!',
  },
  'Ellige hogbeku saar? Meter haaki hogona, kootkoLLi!': {
    script: 'ಎಲ್ಲಿಗೆ ಹೋಗ್ಬೇಕು ಸಾರ್? ಮೀಟರ್ ಹಾಕಿ ಹೋಗೋಣ, ಕೂತ್ಕೊಳ್ಳಿ!',
    english: 'Where do you need to go sir? Let us go by meter, hop in!',
  },

  // BMTC / Ticket Conductor
  'Beda andre munde hogi saar, bereyavrige jaaga kodi!': {
    script: 'ಬೇಡ ಅಂದ್ರೆ ಮುಂದೆ ಹೋಗಿ ಸಾರ್, ಬೇರೆಯವರಿಗೆ ಜಾಗ ಕೊಡಿ!',
    english: "If you don't want move ahead sir, give way to others!",
  },
  'Ticket bedwa? Haagidre pass ideya nodi.': {
    script: 'ಟಿಕೆಟ್ ಬೇಡ್ವಾ? ಹಾಗಿದ್ರೆ ಪಾಸ್ ಇದೆಯಾ ನೋಡಿ.',
    english: "Don't want ticket? Then see if you have a bus pass.",
  },
  'Sari sari, illiye nilsalla, mundina stop alli nilsolla!': {
    script: 'ಸರಿ ಸರಿ, ಇಲ್ಲೇ ನಿಲ್ಸಲ್ಲ, ಮುಂದಿನ ಸ್ಟಾಪ್ ಅಲ್ಲಿ ನಿಲ್ಸಲ್ಲ!',
    english: 'Alright alright, not stopping here, but at next stop!',
  },
  'Parvagilla, stop bandaga heli, bell hoditini.': {
    script: 'ಪರವಾಗಿಲ್ಲ, ಸ್ಟಾಪ್ ಬಂದಾಗ ಹೇಳಿ, ಬೆಲ್ ಹೊಡೀತೀನಿ.',
    english: 'No problem, tell me when your stop comes, I will ring the bell.',
  },
  'Haudhu saar, chillare kodi, ticket togoLLi!': {
    script: 'ಹೌದು ಸಾರ್, ಚಿಲ್ಲರೆ ಕೊಡಿ, ಟಿಕೆಟ್ ತಗೊಳ್ಳಿ!',
    english: 'Yes sir, give change and take the ticket!',
  },
  'Sari munde banni, jaaga ide kootkoli.': {
    script: 'ಸರಿ ಮುಂದೆ ಬನ್ನಿ, ಜಾಗ ಇದೆ ಕೂತ್ಕೊಳ್ಳಿ.',
    english: 'Alright move forward, there is room to sit.',
  },
  'Yaava stop ge ticket beku sir? Majestic ₹25, Indiranagar ₹15 — UPI kooda ide!': {
    script: 'ಯಾವ ಸ್ಟಾಪ್ ಗೆ ಟಿಕೆಟ್ ಬೇಕು ಸರ್? ಮೆಜೆಸ್ಟಿಕ್ ₹25, ಇಂದಿರಾನಗರ ₹15 — ಯುಪಿಐ ಕೂಡ ಇದೆ!',
    english: 'Which stop do you need a ticket for sir? Majestic ₹25, Indiranagar ₹15 — UPI is also available!',
  },

  // Market / Shopkeeper
  'Beda andre bidi amma! Naale fresh tharakaari baratte, banni.': {
    script: 'ಬೇಡ ಅಂದ್ರೆ ಬಿಡಿ ಅಮ್ಮ! ನಾಳೆ ಫ್ರೆಶ್ ತರಕಾರಿ ಬರುತ್ತೆ, ಬನ್ನಿ.',
    english: "If you don't want leave it madam! Fresh vegetables come tomorrow, visit.",
  },
  'Ayyo thagolbedi sir, bere stall alli nodi, aadre nam thara fresh sigalla!': {
    script: 'ಅಯ್ಯೋ ತಗೋಳ್ಬೇಡಿ ಸರ್, ಬೇರೆ ಸ್ಟಾಲ್ ಅಲ್ಲಿ ನೋಡಿ, ಆದ್ರೆ ನಮ್ ತರ ಫ್ರೆಶ್ ಸಿಗಲ್ಲ!',
    english: "Don't buy sir, check other stalls, but won't find fresh like ours!",
  },
  'Sari sari, beda andre illa! Bere enu beku — soppu? eerulli?': {
    script: 'ಸರಿ ಸರಿ, ಬೇಡ ಅಂದ್ರೆ ಇಲ್ಲ! ಬೇರೆ ಏನು ಬೇಕು — ಸೊಪ್ಪು? ಈರುಳ್ಳಿ?',
    english: "Alright, if you don't want no problem! What else — greens? onions?",
  },
  'Parvagilla saar, bejaar illa. Quality mathra super ide!': {
    script: 'ಪರವಾಗಿಲ್ಲ ಸಾರ್, ಬೇಜಾರ್ ಇಲ್ಲ. ಕ್ವಾಲಿಟಿ ಮಾತ್ರ ಸೂಪರ್ ಇದೆ!',
    english: 'No problem sir, no hard feelings. Quality is top-notch!',
  },
  'Haudhu saar, cover alli haaki kodtini, thagoli!': {
    script: 'ಹೌದು ಸಾರ್, ಕವರ್ ಅಲ್ಲಿ ಹಾಕಿ ಕೊಡ್ತೀನಿ, ತಗೋಳಿ!',
    english: 'Yes sir, putting it in a cover, please take!',
  },
  'Sari sir, fresh item, pack maadidini!': {
    script: 'ಸರಿ ಸರ್, ಫ್ರೆಶ್ ಐಟಮ್, ಪ್ಯಾಕ್ ಮಾಡಿದೀನಿ!',
    english: 'Alright sir, fresh items, packed for you!',
  },
  'Fresh tharakaari mathu groceries ide saar — tomato ₹40, onion ₹35, haalu ₹28. Enu kodli?': {
    script: 'ಫ್ರೆಶ್ ತರಕಾರಿ ಮತ್ತು ಗ್ರೋಸರೀಸ್ ಇದೆ ಸಾರ್ — ಟೊಮೇಟೊ ₹40, ಈರುಳ್ಳಿ ₹35, ಹಾಲು ₹28. ಏನು ಕೊಡ್ಲಿ?',
    english: 'Fresh vegetables and groceries available sir — tomato ₹40, onion ₹35, milk ₹28. What shall I pack?',
  },

  // House Owner
  'Mane bedwa? Parvagilla, bere tenants queue nalli iddare!': {
    script: 'ಮನೆ ಬೇಡ್ವಾ? ಪರವಾಗಿಲ್ಲ, ಬೇರೆ ಟೆನೆಂಟ್ಸ್ ಕ್ಯೂನಲ್ಲಿ ಇದ್ದಾರೆ!',
    english: "Don't want the house? No problem, other tenants are in queue!",
  },
  'Rules ishta aaglilla andre bere kade nodkoli thammudu.': {
    script: 'ರೂಲ್ಸ್ ಇಷ್ಟ ಆಗ್ಲಿಲ್ಲ ಅಂದ್ರೆ ಬೇರೆ ಕಡೆ ನೋಡ್ಕೊಳ್ಳಿ ತಮ್ಮುಡು.',
    english: "If you don't like the rules look elsewhere brother.",
  },
  'Sari sari, advance kasto andre swalpa adjust madona.': {
    script: 'ಸರಿ ಸರಿ, ಅಡ್ವಾನ್ಸ್ ಕಷ್ಟ ಅಂದ್ರೆ ಸ್ವಲ್ಪ ಅಡ್ಜಸ್ಟ್ ಮಾಡೋಣ.',
    english: 'Alright, if advance is tough let us adjust a bit.',
  },
  'Aaytu, beda andre bidi! Namma building nalli thumba peace ide.': {
    script: 'ಆಯ್ತು, ಬೇಡ ಅಂದ್ರೆ ಬಿಡಿ! ನಮ್ಮ ಬಿಲ್ಡಿಂಗ್ ನಲ್ಲಿ ತುಂಬಾ ಪೀಸ್ ಇದೆ.',
    english: 'Okay, if not leave it! Our building is very peaceful.',
  },
  'Haudhu, 1st date olage rent kottidre thumba olledu!': {
    script: 'ಹೌದು, ೧ ನೇ ತಾರೀಖು ಒಳಗೆ ರೆಂಟ್ ಕೊಟ್ಟಿದ್ರೆ ತುಂಬಾ ಒಳ್ಳೇದು!',
    english: 'Yes, paying rent before 1st is very good!',
  },
  'Sari, agreement ready maadtini, Aadhaar card kodi.': {
    script: 'ಸರಿ, ಅಗ್ರಿಮೆಂಟ್ ರೆಡಿ ಮಾಡ್ತೀನಿ, ಆಧಾರ್ ಕಾರ್ಡ್ ಕೊಡಿ.',
    english: 'Alright, preparing the agreement, provide Aadhaar card.',
  },
  'Rent ₹12,000, advance ₹50,000, Cauvery neeru daily baratte — innu enu kelbeku?': {
    script: 'ರೆಂಟ್ ₹12,000, ಅಡ್ವಾನ್ಸ್ ₹50,000, ಕಾವೇರಿ ನೀರು ಡೈಲಿ ಬರುತ್ತೆ — ಇನ್ನು ಏನು ಕೇಳ್ಬೇಕು?',
    english: 'Rent is ₹12,000, advance ₹50,000, Cauvery water comes daily — what else would you like to know?',
  },

  // Neighbor
  'Hogbedi bidri! Park nalli swalpa rest maadi, yaake ashtu tension?': {
    script: 'ಹೋಗ್ಬೇಡಿ ಬಿಡ್ರಿ! ಪಾರ್ಕ್ ನಲ್ಲಿ ಸ್ವಲ್ಪ ರೆಸ್ಟ್ ಮಾಡಿ, ಯಾಕೆ ಅಷ್ಟು ಟೆನ್ಷನ್?',
    english: "Don't go yet friend! Rest in park, why so much tension?",
  },
  'Beda andre bidi kano! Naavella retired janagalu, aramavagi iddivi.': {
    script: 'ಬೇಡ ಅಂದ್ರೆ ಬಿಡಿ ಕಣೋ! ನಾವೆಲ್ಲ ರಿಟೈರ್ಡ್ ಜನಗಳು, ಆರಾಮವಾಗಿ ಇದ್ದೀವಿ.',
    english: 'Leave it if not friend! We are retired folks, relaxing peacefully.',
  },
  'Ayyo adjust madbeda guru! Bengaluru weather enjoy maadu sumne.': {
    script: 'ಅಯ್ಯೋ ಅಡ್ಜಸ್ಟ್ ಮಾಡ್ಬೇಡ ಗುರು! ಬೆಂಗಳೂರು ವೆದರ್ ಎಂಜಾಯ್ ಮಾಡು ಸುಮ್ನೆ.',
    english: "Don't overthink friend! Just enjoy the Bengaluru weather.",
  },
  'Sari sari, coffee bedwa? Haagidre weather bagge mathadona banni!': {
    script: 'ಸರಿ ಸರಿ, ಕಾಫಿ ಬೇಡ್ವಾ? ಹಾಗಿದ್ರೆ ವೆದರ್ ಬಗ್ಗೆ ಮಾತಾಡೋಣ ಬನ್ನಿ!',
    english: "Alright, don't want coffee? Then come let's talk about weather!",
  },
  'Haudhu kanree, namma kaaladalli Bengaluru innu super aagittu!': {
    script: 'ಹೌದು ಕಣ್ರೀ, ನಮ್ಮ ಕಾಲದಲ್ಲಿ ಬೆಂಗಳೂರು ಇನ್ನು ಸೂಪರ್ ಆಗಿತ್ತು!',
    english: 'Yes friend, in our time Bengaluru was even more wonderful!',
  },
  'Khanditha, cricket match mathra bittubidbarda!': {
    script: 'ಖಂಡಿತ, ಕ್ರಿಕೆಟ್ ಮ್ಯಾಚ್ ಮಾತ್ರ ಬಿಟ್ಟುಬಿಡ್ಬಾರ್ದು!',
    english: 'Certainly, one must never miss the cricket match!',
  },
  'Banni kanree, filter kaapi kudkondu Bengaluru weather bagge mathadona!': {
    script: 'ಬನ್ನಿ ಕಣ್ರೀ, ಫಿಲ್ಟರ್ ಕಾಫಿ ಕುಡ್ಕೊಂಡು ಬೆಂಗಳೂರು ವೆದರ್ ಬಗ್ಗೆ ಮಾತಾಡೋಣ!',
    english: 'Come friend, let us chat about Bengaluru weather over filter coffee!',
  },

  // Traffic Police
  'Fine bedwa? Haagidre rules follow maadi, helmet yaake haakilla?': {
    script: 'ಫೈನ್ ಬೇಡ್ವಾ? ಹಾಗಿದ್ರೆ ರೂಲ್ಸ್ ಫಾಲೋ ಮಾಡಿ, ಹೆಲ್ಮೆಟ್ ಯಾಕೆ ಹಾಕಿಲ್ಲ?',
    english: "Don't want fine? Then follow rules, why wasn't helmet worn?",
  },
  'Argue madbedi! Side ge gaadi nilsi, documents thorisi.': {
    script: 'ಆರ್ಗ್ಯೂ ಮಾಡ್ಬೇಡಿ! ಸೈಡ್ ಗೆ ಗಾಡಿ ನಿಲ್ಸಿ, ಡಾಕ್ಯುಮೆಂಟ್ಸ್ ತೋರಿಸಿ.',
    english: "Don't argue! Pull vehicle to the side and show documents.",
  },
  'Beda andre aagalla, Bangalore traffic rules ellarigu onde!': {
    script: 'ಬೇಡ ಅಂದ್ರೆ ಆಗಲ್ಲ, ಬೆಂಗಳೂರು ಟ್ರಾಫಿಕ್ ರೂಲ್ಸ್ ಎಲ್ಲರಿಗೂ ಒಂದೇ!',
    english: "Refusal won't work, Bengaluru traffic rules apply to everyone!",
  },
  'Sari, ee sala warning kodtini, matte repeat aagbaardu!': {
    script: 'ಸರಿ, ಈ ಸಲ ವಾರ್ನಿಂಗ್ ಕೊಡ್ತೀನಿ, ಮತ್ತೆ ರಿಪೀಟ್ ಆಗ್ಬಾರ್ದು!',
    english: 'Alright, giving warning this time, must not repeat!',
  },
  'Sari, online challan receipt togoLLi, safe aagi odisi.': {
    script: 'ಸರಿ, ಆನ್‌ಲೈನ್ ಚಲನ್ ರಶೀದಿ ತಗೊಳ್ಳಿ, ಸೇಫ್ ಆಗಿ ಓಡಿಸಿ.',
    english: 'Alright, take the online challan receipt, drive safely.',
  },
  'Haudhu, zebra crossing munde gaadi nilsi.': {
    script: 'ಹೌದು, ಜೀಬ್ರಾ ಕ್ರಾಸಿಂಗ್ ಮುಂದೆ ಗಾಡಿ ನಿಲ್ಸಿ.',
    english: 'Yes, stop vehicle before the zebra crossing.',
  },
  'Sari sir, DL mathu RC book thorisi, illava daari kelbekidre keli!': {
    script: 'ಸರಿ ಸರ್, ಡಿಎಲ್ ಮತ್ತು ಆರ್‌ಸಿ ಬುಕ್ ತೋರಿಸಿ, ಇಲ್ಲವಾ ದಾರಿ ಕೇಳ್ಬೇಕಿದ್ರೆ ಕೇಳಿ!',
    english: 'Alright sir, show your DL and RC book, or ask if you need directions!',
  },

  // Pharmacist
  'Tablet bedwa? Parvagilla sir, swalpa bisi neeru kudi, aaraam aagatte.': {
    script: 'ಟ್ಯಾಬ್ಲೆಟ್ ಬೇಡ್ವಾ? ಪರವಾಗಿಲ್ಲ ಸರ್, ಸ್ವಲ್ಪ ಬಿಸಿ ನೀರು ಕುಡಿ, ಆರಾಮ್ ಆಗತ್ತೆ.',
    english: "Don't want tablet? Drink warm water sir, you will feel better.",
  },
  'Aaytu sir, tonic beda andre bidi. Prescription ideya check maadi.': {
    script: 'ಆಯ್ತು ಸರ್, ಟಾನಿಕ್ ಬೇಡ ಅಂದ್ರೆ ಬಿಡಿ. ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಇದೆಯಾ ಚೆಕ್ ಮಾಡಿ.',
    english: 'Okay sir, leave the tonic if not needed. Check if you have prescription.',
  },
  'Beda andre thagolbedi! Side-effects enu illa, but rest thogoLLi.': {
    script: 'ಬೇಡ ಅಂದ್ರೆ ತಗೋಳ್ಬೇಡಿ! ಸೈಡ್-ಎಫೆಕ್ಟ್ಸ್ ಏನು ಇಲ್ಲ, ಬಟ್ ರೆಸ್ಟ್ ತಗೊಳ್ಳಿ.',
    english: "Don't take if you don't want! No side-effects, but take rest.",
  },
  'Sari sari, beda andre cancel! Doctor ge thorisi aamele banni.': {
    script: 'ಸರಿ ಸರಿ, ಬೇಡ ಅಂದ್ರೆ ಕ್ಯಾನ್ಸಲ್! ಡಾಕ್ಟರ್ ಗೆ ತೋರಿಸಿ ಆಮೇಲೆ ಬನ್ನಿ.',
    english: 'Alright, cancel if not needed! Consult doctor and return.',
  },
  'Haudhu sir, 10 tablets ide, oota aadmele thagoli.': {
    script: 'ಹೌದು ಸರ್, ೧೦ ಮಾತ್ರೆ ಇದೆ, ಊಟ ಆದ್ಮೇಲೆ ತಗೋಳಿ.',
    english: 'Yes sir, contains 10 tablets, take after meals.',
  },
  'Sari, cover alli haaki kodtini, bill ₹30.': {
    script: 'ಸರಿ, ಕವರ್ ಅಲ್ಲಿ ಹಾಕಿ ಕೊಡ್ತೀನಿ, ಬಿಲ್ ₹೩೦.',
    english: 'Alright, packing in cover, bill is ₹30.',
  },
  'Dolo ₹30, cough syrup ₹85, ORS ₹20 ide sir — yaava medicine beku heli?': {
    script: 'ಡೋಲೋ ₹30, ಕಾಫ್ ಸಿರಪ್ ₹85, ಓಆರ್‌ಎಸ್ ₹20 ಇದೆ ಸರ್ — ಯಾವ ಮೆಡಿಸಿನ್ ಬೇಕು ಹೇಳಿ?',
    english: 'Dolo ₹30, cough syrup ₹85, ORS ₹20 are available sir — tell me which medicine you need!',
  },

  // Anna Default
  'Sari guru, bejaar madbedi! Innu bere enadru try maadi.': {
    script: 'ಸರಿ ಗುರು, ಬೇಜಾರ್ ಮಾಡ್ಬೇಡಿ! ಇನ್ನು ಬೇರೆ ಏನಾದ್ರೂ ಟ್ರೈ ಮಾಡಿ.',
    english: "Alright friend, don't worry! Try something else.",
  },
  'Beda andre bidi, aramavagi relax maadi!': {
    script: 'ಬೇಡ ಅಂದ್ರೆ ಬಿಡಿ, ಆರಾಮವಾಗಿ ರಿಲ್ಯಾಕ್ಸ್ ಮಾಡಿ!',
    english: 'Leave it if not, relax peacefully!',
  },
  'Illa parvagilla guru, nimage ishta aagiddanna kaliyiri.': {
    script: 'ಇಲ್ಲ ಪರವಾಗಿಲ್ಲ ಗುರು, ನಿಮಗೆ ಇಷ್ಟ ಆಗಿದ್ದನ್ನ ಕಲಿಯಿರಿ.',
    english: 'No problem friend, learn whatever you enjoy.',
  },
  'Sari sari, tension beda! Naanu sada nimm jothege idde.': {
    script: 'ಸರಿ ಸರಿ, ಟೆನ್ಷನ್ ಬೇಡ! ನಾನು ಸದಾ ನಿಮ್ಮ ಜೊತೆಗೆ ಇದ್ದೇನೆ.',
    english: "Alright, no tension! I'm always with you.",
  },
  'Super guru! Haage munduvariyiri!': {
    script: 'ಸೂಪರ್ ಗುರು! ಹಾಗೆ ಮುಂದುವರಿಯಿರಿ!',
    english: 'Super friend! Keep going like that!',
  },
  'Haudhu! Neavu thumba bega kaliyutiddira!': {
    script: 'ಹೌದು! ನೀವು ತುಂಬಾ ಬೇಗ ಕಲಿಯುತ್ತಿದ್ದೀರಾ!',
    english: 'Yes! You are learning very fast!',
  },
  'Haudhu guru! Kannada-dalli matanadodu thumba sulabha — enu kelbeku heli!': {
    script: 'ಹೌದು ಗುರು! ಕನ್ನಡದಲ್ಲಿ ಮಾತಾಡೋದು ತುಂಬಾ ಸುಲಭ — ಏನು ಕೇಳ್ಬೇಕು ಹೇಳಿ!',
    english: 'Yes friend! Speaking in Kannada is super easy — tell me what you want to say!',
  },
};

/**
 * Returns script and english info for any text.
 * Falls back to sensible defaults.
 */
function getLineDetails(kanglish: string): LineInfo {
  if (LINE_TRANSLATIONS[kanglish]) {
    return LINE_TRANSLATIONS[kanglish];
  }
  return {
    script: kanglish,
    english: kanglish,
  };
}

// =========================================================================
// DEFAULT ANNA BRAIN (Used when activePersona is null or Anna directly)
// =========================================================================

const DEFAULT_ANNA_BRAIN = {
  items: [
    {
      keys: ['kannada', 'learn', 'words', 'speak'],
      name: 'Kannada Learning',
      nameKn: 'ಕನ್ನಡ ಕಲಿಕೆ',
      price: 'Free with Anna!',
    },
    {
      keys: ['tips', 'bengaluru', 'routes', 'darshini'],
      name: 'Bengaluru Survival Tips',
      nameKn: 'ಬೆಂಗಳೂರು ಟಿಪ್ಸ್',
      price: 'Priceless',
    },
  ],
  negationLines: [
    'Sari guru, bejaar madbedi! Innu bere enadru try maadi.',
    'Beda andre bidi, aramavagi relax maadi!',
    'Illa parvagilla guru, nimage ishta aagiddanna kaliyiri.',
    'Sari sari, tension beda! Naanu sada nimm jothege idde.',
  ],
  affirmLines: [
    'Super guru! Haage munduvariyiri!',
    'Haudhu! Neavu thumba bega kaliyutiddira!',
  ],
  dontUnderstand:
    'Haudhu guru! Kannada-dalli matanadodu thumba sulabha — enu kelbeku heli!',
};

// =========================================================================
// PART B — CLAUSE ANALYSIS & INTENT PIPELINE
// =========================================================================

export type PersonaIntent =
  | 'NEGATION_INTENT'
  | 'HOW_TO_SAY'
  | 'MENU_QUERY'
  | 'PAYMENT_QUERY'
  | 'CUSTOMIZATION_QUERY'
  | 'STOP_HERE_QUERY'
  | 'BARGAIN_QUERY'
  | 'AFFIRM'
  | 'GREETING'
  | 'PRICE_QUERY'
  | 'ORDER_ITEM'
  | 'REQUEST'
  | 'LOCATION'
  | 'TIME'
  | 'THANKS'
  | 'BYE'
  | 'NAME'
  | 'FALLBACK';

interface AnalysisResult {
  isNegated: boolean;
  orderedItems: PersonaBrainItem[];
  negatedItems: PersonaBrainItem[];
  intent: PersonaIntent;
  matchedItemForPrice?: PersonaBrainItem;
}

/**
 * Finds menu items matching the text from a persona's brain.
 */
function findMatchingItems(
  text: string,
  items: PersonaBrainItem[]
): PersonaBrainItem[] {
  const norm = ` ${normalize(text)} `;
  const matches: PersonaBrainItem[] = [];
  for (const item of items) {
    for (const key of item.keys) {
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const reg = new RegExp(`\\b${escaped}\\b`, 'i');
      if (reg.test(norm)) {
        if (!matches.some((m) => m.name === item.name)) {
          matches.push(item);
        }
        break;
      }
    }
  }
  return matches;
}

/**
 * Performs clause-based analysis on the cleaned input:
 * Splits on commas, periods, semicolons, and conjunctions ("but", "aadre").
 * Separates items into negated vs ordered.
 */
function analyzeClausesAndIntent(
  rawText: string,
  brainItems: PersonaBrainItem[]
): AnalysisResult {
  const normFull = normalize(rawText);

  // Split into clauses by punctuation or conjunctions
  const clauses = normFull
    .split(/[,.;!?]|\b(but|aadre|aadare|adre)\b/i)
    .map((c) => (c || '').trim())
    .filter((c) => c.length > 0);

  const orderedItems: PersonaBrainItem[] = [];
  const negatedItems: PersonaBrainItem[] = [];
  let anyClauseNegated = false;

  for (const clause of clauses) {
    const isClauseNeg = detectNegation(clause);
    if (isClauseNeg) anyClauseNegated = true;

    const matched = findMatchingItems(clause, brainItems);
    for (const item of matched) {
      if (isClauseNeg) {
        if (!negatedItems.some((n) => n.name === item.name)) {
          negatedItems.push(item);
        }
      } else {
        if (!orderedItems.some((o) => o.name === item.name)) {
          orderedItems.push(item);
        }
      }
    }
  }

  const finalOrderedItems = orderedItems.filter((item) => {
    if (negatedItems.some((n) => n.name === item.name)) return false;
    if (anyClauseNegated) {
      const clauseWithItem = clauses.find(
        (c) => !detectNegation(c) && findMatchingItems(c, [item]).length > 0
      );
      if (clauseWithItem) {
        const hasAffirmativeOrderWord =
          /\b(one|ondu|eradu|two|mooru|three|beku|kodi|kotri|order|give|want|need|bring|tari|pack|get|have)\b/i.test(
            clauseWithItem
          );
        if (!hasAffirmativeOrderWord) {
          if (!negatedItems.some((n) => n.name === item.name)) {
            negatedItems.push(item);
          }
          return false;
        }
      }
    }
    return true;
  });

  // 0. Check if user is asking "How do I say...", "What is ... in Kannada", "Teach me"
  if (
    /\b(how\s+do\s+i\s+(say|ask|order|tell)|how\s+to\s+(say|ask|order|tell)|what\s+is\s+.+\s+in\s+kannada|in\s+kannada|translate|teach\s+me)\b/i.test(
      normFull
    )
  ) {
    return {
      isNegated: false,
      orderedItems: finalOrderedItems,
      negatedItems,
      intent: 'HOW_TO_SAY',
    };
  }

  // Overall text negation check
  const fullTextNegated = detectNegation(normFull) || anyClauseNegated;
  const isOverallNegated = fullTextNegated && finalOrderedItems.length === 0;

  // 1. NEGATION_INTENT (isNegated true)
  if (isOverallNegated) {
    if (negatedItems.length === 0) {
      const fullMatches = findMatchingItems(normFull, brainItems);
      negatedItems.push(...fullMatches);
    }
    return {
      isNegated: true,
      orderedItems: [],
      negatedItems,
      intent: 'NEGATION_INTENT',
    };
  }

  // 2. CUSTOMIZATION_QUERY (less sugar, no sugar, less spicy, extra chutney, parcel/takeaway)
  if (
    /\b(less\s+sugar|no\s+sugar|without\s+sugar|sugarless|less\s+spicy|not\s+spicy|no\s+spice|extra\s+chutney|extra\s+sambar|crispy|roast|parcel|takeaway|pack\s+it|to\s+go)\b/i.test(
      normFull
    )
  ) {
    return {
      isNegated: false,
      orderedItems: finalOrderedItems,
      negatedItems,
      intent: 'CUSTOMIZATION_QUERY',
    };
  }

  // 3. PAYMENT_QUERY (bill, UPI, GPay, PhonePe, QR, scan, change, chillare, pay)
  if (
    /\b(bill\s+please|give\s+bill|the\s+bill|check\s+please|upi|gpay|google\s+pay|phonepe|paytm|qr\s+code|scan|change|chillare|chillar|cash|pay\s+online)\b/i.test(
      normFull
    )
  ) {
    return {
      isNegated: false,
      orderedItems: finalOrderedItems,
      negatedItems,
      intent: 'PAYMENT_QUERY',
    };
  }

  // 4. STOP_HERE_QUERY (stop here, pull over, next stop, left, right, straight, slow, meter)
  if (
    /\b(stop\s+here|pull\s+over|illi\s+nillisi|nillisi|take\s+left|turn\s+left|take\s+right|turn\s+right|go\s+straight|drive\s+slow|slowly|put\s+meter|by\s+meter|meter\s+haaki|next\s+stop|ring\s+the\s+bell)\b/i.test(
      normFull
    )
  ) {
    return {
      isNegated: false,
      orderedItems: finalOrderedItems,
      negatedItems,
      intent: 'STOP_HERE_QUERY',
    };
  }

  // 5. BARGAIN_QUERY (too much, expensive, discount, reduce, kammi maadi)
  if (
    /\b(too\s+much|very\s+expensive|so\s+expensive|expensive|reduce|discount|less\s+price|kammi\s+maadi|swalpa\s+kammi|bargain|final\s+price)\b/i.test(
      normFull
    )
  ) {
    return {
      isNegated: false,
      orderedItems: finalOrderedItems,
      negatedItems,
      intent: 'BARGAIN_QUERY',
    };
  }

  // 6. MENU_QUERY (what do you have, menu, options, available, special, hungry)
  if (
    /\b(menu|what\s+do\s+you\s+have|what\s+is\s+available|what's\s+available|what\s+food|special\s+today|today's\s+special|options|recommend|hungry|thirsty|what\s+can\s+i\s+get|what\s+can\s+i\s+order)\b/i.test(
      normFull
    ) &&
    finalOrderedItems.length === 0
  ) {
    return {
      isNegated: false,
      orderedItems: [],
      negatedItems,
      intent: 'MENU_QUERY',
    };
  }

  // 7. AFFIRM
  if (
    /^(yes|ok|okay|sari|haudhu|haudu|sure|fine|howdu|sari\s+boss|correct)\b/i.test(
      normFull
    ) &&
    finalOrderedItems.length === 0
  ) {
    return {
      isNegated: false,
      orderedItems: finalOrderedItems,
      negatedItems,
      intent: 'AFFIRM',
    };
  }

  // 8. GREETING
  if (
    (/^(hi|hello|hey|namaste|namaskara|good\s+morning|good\s+evening)\b/i.test(
      normFull
    ) ||
      normFull === 'namaskara' ||
      normFull === 'namaste') &&
    finalOrderedItems.length === 0
  ) {
    return {
      isNegated: false,
      orderedItems: finalOrderedItems,
      negatedItems,
      intent: 'GREETING',
    };
  }

  // 9. PRICE_QUERY (AND NOT isNegated)
  if (
    /(eshtu|how\s+much|price|rate|charge|rent|bill|cost|kitna|eshta|fare|ticket\s+price)/i.test(
      normFull
    )
  ) {
    const itemMatches = findMatchingItems(normFull, brainItems);
    return {
      isNegated: false,
      orderedItems: finalOrderedItems,
      negatedItems,
      intent: 'PRICE_QUERY',
      matchedItemForPrice: itemMatches[0],
    };
  }

  // 10. ORDER_ITEM (active persona menu item keywords AND NOT isNegated)
  if (finalOrderedItems.length > 0) {
    return {
      isNegated: false,
      orderedItems: finalOrderedItems,
      negatedItems,
      intent: 'ORDER_ITEM',
    };
  }

  // 11. REQUEST (AND NOT isNegated)
  if (
    /(beku|kodi|kotri|want|need|give|ondu|one\s+|bring|tari|tarri|order|can\s+i\s+have|can\s+i\s+get|please\s+give)/i.test(
      normFull
    )
  ) {
    return {
      isNegated: false,
      orderedItems: finalOrderedItems,
      negatedItems,
      intent: 'REQUEST',
    };
  }

  // 12. LOCATION
  if (
    /(elli|where|route|stop|bus|direction|daari|hege|doora|far|mumbai|bombay|majestic|koramangala|indiranagar|whitefield|silk\s+board|jayanagar|mg\s+road|airport|station|metro)/i.test(
      normFull
    )
  ) {
    return {
      isNegated: false,
      orderedItems: finalOrderedItems,
      negatedItems,
      intent: 'LOCATION',
    };
  }

  // 13. TIME
  if (
    /(yavaga|when|timing|time|open|close|bega|how\s+long)/i.test(normFull)
  ) {
    return {
      isNegated: false,
      orderedItems: finalOrderedItems,
      negatedItems,
      intent: 'TIME',
    };
  }

  // 14. THANKS
  if (/(dhanyavada|thanks|thank)/i.test(normFull)) {
    return {
      isNegated: false,
      orderedItems: finalOrderedItems,
      negatedItems,
      intent: 'THANKS',
    };
  }

  // 15. BYE
  if (
    /(bye|hoguttene|see\s+you|matte\s+bartini|bande\s+bartini|hogi\s+bartini|sigona)/i.test(
      normFull
    )
  ) {
    return {
      isNegated: false,
      orderedItems: finalOrderedItems,
      negatedItems,
      intent: 'BYE',
    };
  }

  // 16. NAME
  if (/(hesaru|your\s+name|who\s+are\s+you|yaaru)/i.test(normFull)) {
    return {
      isNegated: false,
      orderedItems: finalOrderedItems,
      negatedItems,
      intent: 'NAME',
    };
  }

  // 17. FALLBACK
  return {
    isNegated: false,
    orderedItems: finalOrderedItems,
    negatedItems,
    intent: 'FALLBACK',
  };
}

// =========================================================================
// PART D — INTENT → RESPONSE GENERATOR
// =========================================================================

/**
 * Picks the next negation line in round-robin sequence without repeating back-to-back.
 */
function getNextNegationLine(personaId: string, lines: string[]): string {
  if (!lines || lines.length === 0) {
    return 'Sari sir, bejaar madbedi! Innu enu beku?';
  }
  const lastIdx = personaNegationRotation[personaId] ?? -1;
  let nextIdx = (lastIdx + 1) % lines.length;
  if (lines.length > 1 && nextIdx === lastIdx) {
    nextIdx = (nextIdx + 1) % lines.length;
  }
  personaNegationRotation[personaId] = nextIdx;
  return lines[nextIdx];
}

/**
 * Builds the appropriate persona reply given intent and active character domain.
 */
export function replyTo(
  persona: ScenarioCard | null,
  cleanedText: string,
  _history: AnnaChatTurn[] = []
): PersonaReply {
  const norm = normalize(cleanedText);
  const pId = persona?.id || 'anna';
  const brain = persona?.brain || DEFAULT_ANNA_BRAIN;

  const analysis = analyzeClausesAndIntent(cleanedText, brain.items);
  const { intent, orderedItems, negatedItems, matchedItemForPrice } = analysis;

  // Add a single rotating nudge if user asked exclusively in English and tips preference is enabled
  const isEnglishOnly = isEnglishOnlyText(cleanedText);
  const tipsEnabled = getKaliyonaPrefs().tips;
  const englishNudge =
    isEnglishOnly && tipsEnabled
      ? ENGLISH_TIPS[englishTipIndex++ % ENGLISH_TIPS.length]
      : '';

  // -------------------------------------------------------------------------
  // 0. HOW TO SAY / TEACH ME (Direct English-to-Kannada coaching in character)
  // -------------------------------------------------------------------------
  if (intent === 'HOW_TO_SAY') {
    if (pId === 'darshini' || pId === 'darshini-waiter') {
      return {
        script: 'ಆರ್ಡರ್ ಮಾಡೋಕೆ "ಒಂದು ಮಸಾಲ ದೋಸೆ ಕೊಡಿ" ಅಥವಾ "ಕಾಫಿ ಎಷ್ಟು?" ಅಂತ ಕೇಳಿ ಸರ್!',
        kanglish: 'Order maadoke "Ondu masala dose kodi" athava "Filter kaapi eshtu?" antha keli sir!',
        english: 'To order, say "Ondu masala dose kodi" (Give one masala dosa) or "Filter kaapi eshtu?" (How much is filter coffee?)!',
        mood: 'happy',
      };
    }
    if (pId === 'bmtc' || pId === 'bus-conductor') {
      return {
        script: 'ಟಿಕೆಟ್ ಕೇಳೋಕೆ "ಮೆಜೆಸ್ಟಿಕ್ ಗೆ ಒಂದು ಟಿಕೆಟ್ ಕೊಡಿ" ಅಥವಾ "ಈ ಬಸ್ ಮೆಜೆಸ್ಟಿಕ್ ಹೋಗುತ್ತಾ?" ಅಂತ ಕೇಳಿ!',
        kanglish: 'Ticket keloke "Majestic ge ondu ticket kodi" athava "Ee bus Majestic hogutta?" antha keli!',
        english: 'To ask for a ticket, say "Majestic ge ondu ticket kodi" (One ticket to Majestic) or "Ee bus Majestic hogutta?" (Does this bus go to Majestic?)!',
        mood: 'happy',
      };
    }
    if (pId === 'auto') {
      return {
        script: 'ಆಟೋ ಕೇಳೋಕೆ "ಇಂದಿರಾನಗರಕ್ಕೆ ಬರ್ತೀರಾ? ಮೀಟರ್ ಹಾಕಿ" ಅಂತ ಹೇಳಿ ಸಾರ್!',
        kanglish: 'Auto keloke "Indiranagar ge bartira? Meter haaki" antha heli saar!',
        english: 'To ask an auto driver, say "Indiranagar ge bartira? Meter haaki" (Will you come to Indiranagar? Put on the meter)!',
        mood: 'happy',
      };
    }
    if (pId === 'market' || pId === 'shopkeeper') {
      return {
        script: 'ಅಂಗಡಿಯಲ್ಲಿ "ಟೊಮೇಟೊ ಎಷ್ಟು ಕೆಜಿ?" ಅಥವಾ "ಸ್ವಲ್ಪ ಕಮ್ಮಿ ಮಾಡಿ" ಅಂತ ಕೇಳಿ!',
        kanglish: 'Angadiyalli "Tomato eshtu kg?" athava "Swalpa kammi maadi" antha keli!',
        english: 'At the shop, ask "Tomato eshtu kg?" (How much per kg for tomatoes?) or "Swalpa kammi maadi" (Reduce the price a bit)!',
        mood: 'happy',
      };
    }
    return {
      script: 'ಕನ್ನಡದಲ್ಲಿ ಕೇಳೋಕೆ "ನನಗೆ ಇದು ಬೇಕು" (I want this) ಅಥವಾ "ಇದು ಎಷ್ಟು?" (How much is this?) ಅಂತ ಹೇಳಿ ಗುರು!',
      kanglish: 'Kannada-dalli keloke "Nanage idu beku" (I want this) athava "Idu eshtu?" (How much is this?) antha heli guru!',
      english: 'In Kannada, say "Nanage idu beku" (I want this) or "Idu eshtu?" (How much is this?) friend!',
      mood: 'excited',
    };
  }

  // -------------------------------------------------------------------------
  // 1. NEGATION INTENT: Always wins, rotation guaranteed, relieves item if mentioned
  // -------------------------------------------------------------------------
  if (intent === 'NEGATION_INTENT') {
    const isDarshini = pId === 'darshini' || pId === 'darshini-waiter';
    const hasCoffeeNegation = negatedItems.some(
      (item) =>
        item.keys.includes('coffee') ||
        item.keys.includes('kaapi') ||
        item.name.toLowerCase().includes('coffee')
    );

    if (isDarshini && hasCoffeeNegation) {
      return {
        script: 'ಸರಿ ಸರಿ! ಕಾಫಿ ಇಲ್ಲ ಅಂದ್ರೆ ಟೀ ಇದೆ ಸರ್?',
        kanglish: `Sari sari! Coffee illa andre tea idde sir?${englishNudge}`,
        english: 'Alright! If no coffee, tea is available sir?',
        mood: 'happy',
      };
    }

    const rawLine = getNextNegationLine(pId, brain.negationLines);
    const lineDetails = getLineDetails(rawLine);

    return {
      script: lineDetails.script,
      kanglish: `${rawLine}${englishNudge}`,
      english: lineDetails.english,
      mood: 'happy',
    };
  }

  // -------------------------------------------------------------------------
  // 2. CUSTOMIZATION QUERY (less sugar, not spicy, parcel, etc.)
  // -------------------------------------------------------------------------
  if (intent === 'CUSTOMIZATION_QUERY') {
    if (/\b(sugar|sweet|sakkare)\b/i.test(norm)) {
      return {
        script: 'ಸರಿ ಸರ್, ಸಕ್ಕರೆ ಕಮ್ಮಿ ಹಾಕಿ ಫಿಲ್ಟರ್ ಕಾಫಿ ಕೊಡ್ತೀನಿ!',
        kanglish: 'Sari sir, sakkare kammi haaki filter kaapi kodtini! (Tip: say "sakkare kammi" for less sugar)',
        english: 'Sure sir, I will bring filter coffee with less sugar!',
        mood: 'happy',
      };
    }
    if (/\b(spicy|spice|khara)\b/i.test(norm)) {
      return {
        script: 'ಆಯ್ತು ಬಾಸ್, ಖಾರ ಕಮ್ಮಿ ಮಾಡಿ ಚಟ್ನಿ ಜೊತೆ ತರ್ತೀನಿ!',
        kanglish: 'Aaytu boss, khara kammi maadi chutney jothe tartini! (Tip: say "khara kammi" for less spicy)',
        english: 'Done boss, I will make it less spicy and bring it with chutney!',
        mood: 'happy',
      };
    }
    if (/\b(parcel|takeaway|pack|to\s+go)\b/i.test(norm)) {
      return {
        script: 'ಸರಿ ಸರ್, ನೀಟಾಗಿ ಪಾರ್ಸೆಲ್ ಕಟ್ಟಿ ಕೊಡ್ತೀನಿ, ಎರಡು ನಿಮಿಷ!',
        kanglish: 'Sari sir, neetaagi parcel katti kodtini, eradu nimisha! (Tip: say "parcel kodi" for takeaway)',
        english: 'Sure sir, I will pack the parcel neatly for takeaway in two minutes!',
        mood: 'happy',
      };
    }
    return {
      script: 'ಖಂಡಿತ ಬಾಸ್, ನೀವು ಹೇಳಿದ ಹಾಗೆ ಮಾಡಿಕೊಡ್ತೀನಿ!',
      kanglish: `Khanditha boss, neevu helida haage maadikodtini!${englishNudge}`,
      english: 'Certainly boss, I will prepare it just the way you asked!',
      mood: 'happy',
    };
  }

  // -------------------------------------------------------------------------
  // 3. PAYMENT / BILL / UPI / CHANGE QUERY
  // -------------------------------------------------------------------------
  if (intent === 'PAYMENT_QUERY') {
    if (pId === 'bmtc' || pId === 'bus-conductor') {
      return {
        script: 'ಪರವಾಗಿಲ್ಲ ಸರ್, ಚಿಲ್ಲರೆ ಇಲ್ಲ ಅಂದ್ರೆ ಯುಪಿಐ ಕ್ಯೂಆರ್ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ ಟಿಕೆಟ್ ತಗೊಳ್ಳಿ!',
        kanglish: 'Parvagilla sir, chillare illa andre UPI QR scan maadi ticket togoLLi!',
        english: 'No problem sir, if you have no change, scan the UPI QR code and take your ticket!',
        mood: 'happy',
      };
    }
    if (pId === 'auto') {
      return {
        script: 'ಚಿಲ್ಲರೆ ಟೆನ್ಷನ್ ಬೇಡ ಸಾರ್, ಜಿಪೇ ಅಥವಾ ಫೋನ್‌ಪೇ ಕ್ಯೂಆರ್ ಕೋಡ್ ಇದೆ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ!',
        kanglish: 'Chillare tension beda saar, GPay athava PhonePe QR code ide scan maadi!',
        english: 'No worries about change sir, GPay or PhonePe QR code is right here to scan!',
        mood: 'happy',
      };
    }
    return {
      script: 'ಸರಿ ಸರ್, ಬಿಲ್ ರೆಡಿ ಇದೆ! ಕೌಂಟರ್ ಹತ್ತಿರ ಕ್ಯೂಆರ್ ಕೋಡ್ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ ಅಥವಾ ಕ್ಯಾಶ್ ಕೊಡಿ.',
      kanglish: 'Sari sir, bill ready ide! Counter hatra QR code scan maadi athava cash kodi. (Tip: say "bill kodi")',
      english: 'Sure sir, the bill is ready! Scan the QR code near the counter or pay cash.',
      mood: 'happy',
    };
  }

  // -------------------------------------------------------------------------
  // 4. STOP HERE / DIRECTIONS / METER QUERY
  // -------------------------------------------------------------------------
  if (intent === 'STOP_HERE_QUERY') {
    if (pId === 'bmtc' || pId === 'bus-conductor') {
      return {
        script: 'ಸರಿ ಸರ್, ಮುಂದಿನ ಸ್ಟಾಪ್ ಅಲ್ಲೇ ಬೆಲ್ ಹೊಡೀತೀನಿ, ಬಾಗಿಲ ಹತ್ತಿರ ಬನ್ನಿ!',
        kanglish: 'Sari sir, mundina stop alle bell hoditini, baagila hatra banni! (Tip: say "mundina stop nillisi")',
        english: 'Sure sir, I will ring the bell at the next stop, come near the door!',
        mood: 'happy',
      };
    }
    return {
      script: 'ಸರಿ ಸಾರ್, ಇಲ್ಲೇ ಸೈಡ್ ಗೆ ನಿಲ್ಲಿಸ್ತೀನಿ! ಮೀಟರ್ ಹಾಕೇ ಓಡಿಸ್ತಿದ್ದೀನಿ.',
      kanglish: 'Sari saar, ille side ge nillisthini! Meter haake odisthiddini. (Tip: say "illi nillisi" to stop here)',
      english: 'Alright sir, pulling over right here! Driving by the meter as requested.',
      mood: 'happy',
    };
  }

  // -------------------------------------------------------------------------
  // 5. BARGAIN / REDUCE PRICE QUERY
  // -------------------------------------------------------------------------
  if (intent === 'BARGAIN_QUERY') {
    if (pId === 'auto') {
      return {
        script: 'ಸಾರ್ ಟ್ರಾಫಿಕ್ ನೋಡಿ! ಸರಿ ಬಿಡಿ, ಮೀಟರ್ ಮೇಲೆ ಹೋಗೋಣ ಕುತ್ಕೊಳ್ಳಿ.',
        kanglish: 'Saar traffic nodi! Sari bidi, meter mele hogona kootkoLLi. (Tip: say "meter haaki")',
        english: 'Look at the traffic sir! Alright, let us just go by the meter, hop in.',
        mood: 'happy',
      };
    }
    if (pId === 'landlord-aunty') {
      return {
        script: 'ಸರಿ ತಮ್ಮಾ, ನೀವು ಒಳ್ಳೆ ಟೆನೆಂಟ್ ಅನ್ಸುತ್ತೆ — ಬಾಡಿಗೆಯಲ್ಲಿ ₹500 ಕಮ್ಮಿ ಮಾಡ್ತೀನಿ!',
        kanglish: 'Sari thamma, neevu olle tenant ansutte — baadigeyalli ₹500 kammi maadtini!',
        english: 'Alright brother, you seem like a good tenant — I will reduce the rent by ₹500!',
        mood: 'happy',
      };
    }
    return {
      script: 'ನಮ್ಮದು ಫ್ರೆಶ್ ಕ್ವಾಲಿಟಿ ಸರ್! ಸರಿ ನಿಮಗೋಸ್ಕರ ₹10 ಕಮ್ಮಿ ಮಾಡ್ತೀನಿ ತಗೊಳ್ಳಿ.',
      kanglish: 'Nammadu fresh quality sir! Sari nimagoskara ₹10 kammi maadtini togoLLi. (Tip: say "swalpa kammi maadi")',
      english: 'Ours is fresh quality sir! Alright, for you I will reduce ₹10, please take it.',
      mood: 'happy',
    };
  }

  // -------------------------------------------------------------------------
  // 6. MENU / AVAILABILITY QUERY
  // -------------------------------------------------------------------------
  if (intent === 'MENU_QUERY') {
    if (pId === 'darshini' || pId === 'darshini-waiter') {
      return {
        script: 'ಬಿಸಿ ಇಡ್ಲಿ ₹30, ವಡೆ ₹25, ಮಸಾಲ ದೋಸೆ ₹50, ಖಾರಾ ಬಾತ್ ₹35, ಫಿಲ್ಟರ್ ಕಾಫಿ ₹20 ಇದೆ ಬಾಸ್! ಏನು ತರ್ಲಿ?',
        kanglish: 'Bisi idli ₹30, vade ₹25, masala dose ₹50, khara bath ₹35, filter kaapi ₹20 ide boss! Enu tarli?',
        english: 'Hot idli ₹30, vada ₹25, masala dosa ₹50, khara bath ₹35, and filter coffee ₹20 are ready boss! What can I bring you?',
        mood: 'excited',
      };
    }
    const top4 = brain.items.slice(0, 4);
    const kangList = top4.map((i) => `${i.name} (${i.price})`).join(', ');
    const knList = top4.map((i) => `${i.nameKn} (${i.price})`).join(', ');
    return {
      script: `${knList} ಲಭ್ಯವಿದೆ ಸರ್! ನಿಮಗೆ ಏನು ಬೇಕು ಹೇಳಿ.`,
      kanglish: `${kangList} ide sir! Nimage enu beku heli.${englishNudge}`,
      english: `We have ${kangList} sir! Tell me what you need.`,
      mood: 'happy',
    };
  }

  // -------------------------------------------------------------------------
  // 7. AFFIRM: persona affirm line
  // -------------------------------------------------------------------------
  if (intent === 'AFFIRM') {
    const affirmLine = brain.affirmLines[0] || 'Sari boss, eradu nimisha!';
    const lineDetails = getLineDetails(affirmLine);

    return {
      script: lineDetails.script,
      kanglish: `${affirmLine}${englishNudge}`,
      english: lineDetails.english,
      mood: 'excited',
    };
  }

  // -------------------------------------------------------------------------
  // 8. GREETING
  // -------------------------------------------------------------------------
  if (intent === 'GREETING') {
    if (persona?.introLines && persona.introLines.length > 0) {
      const intro = persona.introLines[0];
      return {
        script: intro.script,
        kanglish: `${intro.kanglish}${englishNudge}`,
        english: `Namaste! I am the ${persona.title}. How can I help you today?`,
        mood: 'happy',
      };
    }

    return {
      script: 'ನಮಸ್ಕಾರ ಗುರು! ಹೆಗಿದ್ದೀರಾ? ನಾನು ಅಣ್ಣ, ನಿಮ್ಮ ಬೆಂಗಳೂರು ಬಡ್ಡಿ!',
      kanglish: `Namaskara guru! Hegiddira? Naanu Anna, nimma Bengaluru buddy!${englishNudge}`,
      english: "Namaskara friend! How are you? I'm Anna, your Bengaluru buddy!",
      mood: 'happy',
    };
  }

  // -------------------------------------------------------------------------
  // 9. PRICE QUERY: item-specific OR lists 2-3 prices
  // -------------------------------------------------------------------------
  if (intent === 'PRICE_QUERY') {
    if (matchedItemForPrice) {
      return {
        script: `${matchedItemForPrice.nameKn} ${matchedItemForPrice.price} ಸರ್!`,
        kanglish: `${matchedItemForPrice.name} ${matchedItemForPrice.price} sir!${englishNudge}`,
        english: `${matchedItemForPrice.name} is ${matchedItemForPrice.price} sir!`,
        mood: 'happy',
      };
    }

    if (pId === 'darshini' || pId === 'darshini-waiter') {
      return {
        script: 'ಇಡ್ಲಿ ₹30, ದೋಸೆ ₹50, ಕಾಫಿ ₹20 ಸರ್!',
        kanglish: `Idli ₹30, dose ₹50, kaapi ₹20 sir!${englishNudge}`,
        english: 'Idli ₹30, dosa ₹50, coffee ₹20 sir!',
        mood: 'happy',
      };
    }
    if (pId === 'auto') {
      return {
        script: 'ಬೇಸ್ ₹40, ಕಿಮೀ ₹15, ಮೆಜೆಸ್ಟಿಕ್ ₹120 ಸರ್!',
        kanglish: `Base ₹40, per km ₹15, Majestic ₹120 sir!${englishNudge}`,
        english: 'Base ₹40, per km ₹15, Majestic ₹120 sir!',
        mood: 'happy',
      };
    }
    if (pId === 'bmtc' || pId === 'bus-conductor') {
      return {
        script: 'ಲೋಕಲ್ ₹10, ಮೆಜೆಸ್ಟಿಕ್ ₹25, ಡೈಲಿ ಪಾಸ್ ₹70 ಸರ್!',
        kanglish: `Local ₹10, Majestic ₹25, Daily pass ₹70 sir!${englishNudge}`,
        english: 'Local ₹10, Majestic ₹25, Daily pass ₹70 sir!',
        mood: 'happy',
      };
    }
    if (pId === 'market') {
      return {
        script: 'ಟೊಮೇಟೊ ₹40/ಕೆಜಿ, ಈರುಳ್ಳಿ ₹35/ಕೆಜಿ, ಆಲೂಗಡ್ಡೆ ₹30/ಕೆಜಿ ಸರ್!',
        kanglish: `Tomato ₹40/kg, onion ₹35/kg, potato ₹30/kg sir!${englishNudge}`,
        english: 'Tomato ₹40/kg, onion ₹35/kg, potato ₹30/kg sir!',
        mood: 'happy',
      };
    }
    if (pId === 'landlord-aunty') {
      return {
        script: 'ಬಾಡಿಗೆ ತಿಂಗಳಿಗೆ ₹12,000, ಅಡ್ವಾನ್ಸ್ ₹50,000, ನೀರು ₹500!',
        kanglish: `Rent ₹12,000, advance ₹50,000, water ₹500!${englishNudge}`,
        english: 'Rent ₹12,000, advance ₹50,000, water ₹500!',
        mood: 'thinking',
      };
    }
    if (pId === 'traffic-police') {
      return {
        script: 'ಹೆಲ್ಮೆಟ್ ಇಲ್ಲದ್ದಕ್ಕೆ ₹500, ಸಿಗ್ನಲ್ ಜಂಪ್ ₹1,000 ಫೈನ್ ಸರ್!',
        kanglish: `Helmet fine ₹500, signal jump ₹1,000 sir!${englishNudge}`,
        english: 'Helmet fine ₹500, signal jump fine ₹1,000 sir!',
        mood: 'thinking',
      };
    }
    if (pId === 'pharmacy-bhaiya') {
      return {
        script: 'ಡೋಲೋ ₹30, ಪ್ಯಾರಸಿಟಮಾಲ್ ₹15, ಬ್ಯಾಂಡೇಜ್ ₹30 ಸರ್!',
        kanglish: `Dolo ₹30, paracetamol ₹15, bandage ₹30 sir!${englishNudge}`,
        english: 'Dolo ₹30, paracetamol ₹15, bandage ₹30 sir!',
        mood: 'happy',
      };
    }

    const top3 = brain.items.slice(0, 3);
    const kanglishList = top3.map((i) => `${i.name} ${i.price}`).join(', ');
    const scriptList = top3.map((i) => `${i.nameKn} ${i.price}`).join(', ');
    return {
      script: `${scriptList} ಸರ್!`,
      kanglish: `${kanglishList} sir!${englishNudge}`,
      english: `${kanglishList} sir!`,
      mood: 'happy',
    };
  }

  // -------------------------------------------------------------------------
  // 10. ORDER ITEM: confirms THAT item + price
  // -------------------------------------------------------------------------
  if (intent === 'ORDER_ITEM') {
    if (orderedItems.length === 1) {
      const item = orderedItems[0];
      return {
        script: `ಒಂದು ${item.nameKn} ${item.price}, ಎರಡು ನಿಮಿಷ ಸರ್!`,
        kanglish: `Ondu ${item.name} ${item.price}, eradu nimisha sir!${englishNudge}`,
        english: `One ${item.name} (${item.price}), coming right up in two minutes sir!`,
        mood: 'excited',
      };
    }

    const namesKn = orderedItems.map((i) => `ಒಂದು ${i.nameKn} ${i.price}`).join(' ಮತ್ತು ');
    const namesKang = orderedItems.map((i) => `Ondu ${i.name} ${i.price}`).join(' mathu ');
    return {
      script: `${namesKn}, ಎರಡು ನಿಮಿಷ ಸರ್!`,
      kanglish: `${namesKang}, eradu nimisha sir!${englishNudge}`,
      english: `${orderedItems.map((i) => `one ${i.name} (${i.price})`).join(' and ')}, ready in two minutes sir!`,
      mood: 'excited',
    };
  }

  // -------------------------------------------------------------------------
  // 11. REQUEST (General want / need / kodi)
  // -------------------------------------------------------------------------
  if (intent === 'REQUEST') {
    if (pId === 'darshini' || pId === 'darshini-waiter') {
      return {
        script: 'ಆಯ್ತು ಬಾಸ್! ಎರಡು ನಿಮಿಷದಲ್ಲಿ ಬಿಸಿ ಬಿಸಿ ತರ್ತೀನಿ.',
        kanglish: `Aaytu boss! Eradu nimishadalli bisi bisi tartini.${englishNudge}`,
        english: 'Done boss! In two minutes I will bring it piping hot.',
        mood: 'excited',
      };
    }
    if (pId === 'auto') {
      return {
        script: 'ಕೂತ್ಕೊಳ್ಳಿ ಸರ್, ಮೀಟರ್ ಹಾಕಿ ಬೇಗ ಹೋಗೋಣ!',
        kanglish: `KootkoLLi sir, meter haaki bega hogona!${englishNudge}`,
        english: 'Please sit sir, let us put on the meter and go quickly!',
        mood: 'happy',
      };
    }
    if (pId === 'bmtc' || pId === 'bus-conductor') {
      return {
        script: 'ತಗೊಳ್ಳಿ ಟಿಕೆಟ್ ಸರ್, ಚಿಲ್ಲರೆ ಅಥವಾ ಯುಪಿಐ ಕೊಡಿ.',
        kanglish: `TogoLLi ticket sir, chillare athava UPI kodi.${englishNudge}`,
        english: 'Here is your ticket sir, pay by change or UPI.',
        mood: 'happy',
      };
    }
    if (pId === 'pharmacy-bhaiya') {
      return {
        script: 'ಇಲ್ಲಿದೆ ಸರ್, ದಿನಕ್ಕೆ ಎರಡು ಸಲ ಊಟದ ನಂತರ ತಗೊಳ್ಳಿ.',
        kanglish: `Illide sir, dinakke eradu sala ootada nanthara togoLLi.${englishNudge}`,
        english: 'Here it is sir, take it twice a day after meals.',
        mood: 'happy',
      };
    }
    if (pId === 'market' || pId === 'shopkeeper') {
      return {
        script: 'ಖಂಡಿತ ಅಣ್ಣ, ಕವರ್‌ನಲ್ಲಿ ಹಾಕಿ ಕೊಡ್ತೀನಿ.',
        kanglish: `Khanditha anna, cover-nalli haaki kodtini.${englishNudge}`,
        english: 'Certainly brother, I will pack it in a cover.',
        mood: 'happy',
      };
    }
    return {
      script: 'ಸರಿ ಗುರು! ಏನು ಬೇಕೋ ಖುಷಿಯಿಂದ ಕೇಳಿ, "ಕೊಡಿ" ಅಂದ್ರೆ ಗೌರವ.',
      kanglish: `Sari guru! Enu beko khushiyinda keli, "kodi" andre gourava.${englishNudge}`,
      english: 'Alright friend! Ask freely, saying "kodi" shows respect.',
      mood: 'happy',
    };
  }

  // -------------------------------------------------------------------------
  // 12. LOCATION / ROUTE / MUMBAI
  // -------------------------------------------------------------------------
  if (intent === 'LOCATION') {
    if (norm.includes('mumbai') || norm.includes('bombay')) {
      if (pId === 'auto') {
        return {
          script: 'ಮುಂಬೈಗೆ ಆಟೋ ಹೋಗಲ್ಲ ಸಾರ್! ಕೆಂಪೇಗೌಡ ಬಸ್ ಸ್ಟೇಷನ್‌ಗೆ ಹೋಗಿ ಟ್ರೈನ್ ಹಿಡೀರಿ!',
          kanglish: 'Mumbai ge auto hogalla saar! Kempegowda Bus Station ge hogi train hidiri!',
          english: "Auto doesn't go to Mumbai sir! Go to Kempegowda Bus Station and catch a train!",
          mood: 'excited',
        };
      }
      if (pId === 'bus-conductor' || pId === 'bmtc') {
        return {
          script: 'ಇದು ಬಿಎಂಟಿಸಿ ಲೋಕಲ್ ಬಸ್ ಸಾರ್! ಮುಂಬೈಗೆ ಮೆಜೆಸ್ಟಿಕ್‌ನಲ್ಲಿ ಕೆಎಸ್‌ಆರ್‌ಟಿಸಿ ಸ್ಲೀಪರ್ ತಗೋಬೇಕು.',
          kanglish: 'Idhu BMTC local bus saar! Mumbai ge Majestic-nalli KSRTC sleeper togobeku.',
          english: 'This is BMTC local bus sir! For Mumbai you must take KSRTC sleeper at Majestic.',
          mood: 'thinking',
        };
      }
      return {
        script: 'ಮುಂಬೈಗೆ ಆಟೋ ಹೋಗಲ್ಲ ಗುರು! ಮೆಜೆಸ್ಟಿಕ್‌ಗೆ ಹೋಗಿ ಕೆಎಸ್‌ಆರ್‌ಟಿಸಿ ಬಸ್ ಹಿಡೀರಿ.',
        kanglish: 'Mumbai ge auto hogalla guru! Majestic ge hogi KSRTC bus hidiri.',
        english: "Auto doesn't go to Mumbai friend! Go to Majestic and catch a KSRTC bus.",
        mood: 'excited',
      };
    }

    if (pId === 'auto') {
      return {
        script: 'ನೇರವಾಗಿ ಹೋಗಿ ರೈಟ್ ತಗೊಂಡ್ರೆ ಬರುತ್ತೆ ಸರ್, ಕೂತ್ಕೊಳ್ಳಿ ಮೀಟರ್ ಹಾಕಿ ಹೋಗೋಣ.',
        kanglish: `Neravaagi hogi right thogondre baratte sir, kootkoLLi meter haaki hogona.${englishNudge}`,
        english: 'Go straight and take a right sir, hop in and we will go by meter.',
        mood: 'happy',
      };
    }
    if (pId === 'bus-conductor' || pId === 'bmtc') {
      return {
        script: 'ಹೌದು ಸರ್ ಈ ಬಸ್ ಹೋಗುತ್ತೆ! ಮುಂದಿನ ಸ್ಟಾಪ್ ಬಂದಾಗ ಬೆಲ್ ಹೊಡೀತೀನಿ ರೆಡಿ ಇರಿ.',
        kanglish: `Haudhu sir ee bus hogutte! Mundina stop bandaga bell hodeethini ready iri.${englishNudge}`,
        english: 'Yes sir, this bus goes there! I will ring the bell when your stop comes, be ready.',
        mood: 'happy',
      };
    }
    if (pId === 'traffic-police') {
      return {
        script: 'ನೇರವಾಗಿ ಹೋಗಿ ಸಿಗ್ನಲ್ ಹತ್ತಿರ ಲೆಫ್ಟ್ ತಗೊಳ್ಳಿ ಸರ್, ಅಲ್ಲೇ ಮೇನ್ ರೋಡ್ ಸಿಗುತ್ತೆ.',
        kanglish: `Neravaagi hogi signal hatra left togoLLi sir, alle main road sigutte.${englishNudge}`,
        english: 'Go straight and take a left near the signal sir, you will find the main road right there.',
        mood: 'happy',
      };
    }
    if (pId === 'neighbor-uncle') {
      return {
        script: 'ಇಲ್ಲೇ ಹತ್ತಿರದಲ್ಲಿದೆ ಕಣ್ರೀ, ವಾಕಬಲ್ ಡಿಸ್ಟೆನ್ಸ್ ಅಷ್ಟೇ.',
        kanglish: `Ille hatthiradallide kanree, walkable distance ashte.${englishNudge}`,
        english: 'It is right nearby friend, just walkable distance.',
        mood: 'happy',
      };
    }
    return {
      script: 'ಹೋಗೋ ದಾರಿ ಕೇಳೋಕೆ "ಎಲ್ಲಿ ಹೋಗ್ಬೇಕು?" ಅಥವಾ "ಹೇಗೆ ಹೋಗ್ಬೇಕು?" ಅಂತ ಕೇಳಿ!',
      kanglish: `Hogo daari keloke "Elli hogbeku?" athava "Hege hogbeku?" antha keli!${englishNudge}`,
      english: "To ask for directions, say 'Elli hogbeku?' or 'Hege hogbeku?'",
      mood: 'excited',
    };
  }

  // -------------------------------------------------------------------------
  // 13. TIME
  // -------------------------------------------------------------------------
  if (intent === 'TIME') {
    if (pId === 'darshini' || pId === 'darshini-waiter') {
      return {
        script: 'ಬಿಸಿ ಬಿಸಿ ತಿಂಡಿ ಸದಾ ರೆಡಿ ಇರುತ್ತೆ ಬಾಸ್, ಎರಡೇ ನಿಮಿಷದಲ್ಲಿ ಕೊಡ್ತೀನಿ!',
        kanglish: `Bisi bisi thindi sada ready irutte boss, erade nimishadalli kodtini!${englishNudge}`,
        english: 'Piping hot snacks are always ready boss, I will serve you in just two minutes!',
        mood: 'happy',
      };
    }
    if (pId === 'bmtc' || pId === 'bus-conductor') {
      return {
        script: 'ಪ್ರತಿ ೧೦ ನಿಮಿಷಕ್ಕೆ ಒಂದು ಬಸ್ ಬರುತ್ತೆ ಸಾರ್!',
        kanglish: `Prathi 10 nimishakke ondu bus baratte saar!${englishNudge}`,
        english: 'Every 10 minutes a bus arrives sir!',
        mood: 'happy',
      };
    }
    if (pId === 'landlord-aunty') {
      return {
        script: 'ಕಾವೇರಿ ನೀರು ಬೆಳಗ್ಗೆ ೬ ಗಂಟೆಗೆ ಬರುತ್ತೆ, ಗೇಟ್ ೧೦:೩೦ ಕ್ಕೆ ಲಾಕ್ ಆಗುತ್ತೆ.',
        kanglish: `Cauvery neeru beLagge 6 gantege baratte, gate 10:30 kke lock.${englishNudge}`,
        english: 'Cauvery water comes at 6 AM, gate locks at 10:30 PM.',
        mood: 'happy',
      };
    }
    return {
      script: 'ಟೈಮಿಂಗ್ ಬಗ್ಗೆ ಕೇಳೋಕೆ "ಯಾವಾಗ?" ಅಥವಾ "ಎಷ್ಟು ಹೊತ್ತು?" ಅಂತ ಕೇಳ್ತಾರೆ.',
      kanglish: `Timing bagge keloke "Yaavaga?" athava "Eshtu hottu?" antha heLtare.${englishNudge}`,
      english: 'To ask timing, say "Yaavaga?" (When?) or "Eshtu hottu?" (How long?).',
      mood: 'happy',
    };
  }

  // -------------------------------------------------------------------------
  // 14. THANKS
  // -------------------------------------------------------------------------
  if (intent === 'THANKS') {
    if (pId === 'auto') {
      return {
        script: 'ವೆಲ್‌ಕಮ್ ಸರ್! ರೇಟಿಂಗ್ ೫ ಸ್ಟಾರ್ ಕೊಡಿ ಆ್ಯಪ್‌ನಲ್ಲಿ!',
        kanglish: `Welcome sir! Rating 5 star kodi app-nalli!${englishNudge}`,
        english: 'Welcome sir! Give a 5 star rating in the app!',
        mood: 'happy',
      };
    }
    if (pId === 'darshini' || pId === 'darshini-waiter') {
      return {
        script: 'ಥ್ಯಾಂಕ್ಸ್ ಬಾಸ್, ಮತ್ತೆ ಬನ್ನಿ! ಫಿಲ್ಟರ್ ಕಾಫಿ ಸದಾ ರೆಡಿ ಇರುತ್ತೆ.',
        kanglish: `Thanks boss, matte banni! Filter coffee sada ready irutte.${englishNudge}`,
        english: 'Thanks boss, come again! Filter coffee is always ready.',
        mood: 'happy',
      };
    }
    if (pId === 'neighbor-uncle') {
      return {
        script: 'ಅಯ್ಯೋ ಮೆನ್ಷನ್ ಮಾಡ್ಬೇಡಿ ಕಣ್ರೀ, ನಾವೆಲ್ಲ ಒಂದೇ ಏರಿಯಾ ಅಲ್ವಾ!',
        kanglish: `Ayyo mention maadbedi kanree, naavella onde area alva!${englishNudge}`,
        english: "Ayyo don't mention friend, we are all from the same area right!",
        mood: 'happy',
      };
    }
    return {
      script: 'ತುಂಬಾ ಧನ್ಯವಾದ ಗುರು! ಕನ್ನಡ ಕಲಿಯೋಕೆ ನಿಮ್ಮ ಉತ್ಸಾಹ ಸೂಪರ್!',
      kanglish: `Thumba dhanyavada guru! Kannada kaliyoke nimma utsaaha super!${englishNudge}`,
      english: 'Thank you very much friend! Your enthusiasm to learn Kannada is super!',
      mood: 'excited',
    };
  }

  // -------------------------------------------------------------------------
  // 15. BYE
  // -------------------------------------------------------------------------
  if (intent === 'BYE') {
    if (persona?.exitLine) {
      return {
        script: persona.exitLine.script,
        kanglish: `${persona.exitLine.kanglish}${englishNudge}`,
        english: 'See you again!',
        mood: 'happy',
      };
    }
    return {
      script: 'ಸರಿ ಗುರು, ಮತ್ತೆ ಸಿಗೋಣ! ಹುಷಾರಾಗಿ ಹೋಗಿ ಬನ್ನಿ.',
      kanglish: `Sari guru, matte sigona! Hushaaraagi hogi banni.${englishNudge}`,
      english: 'Alright friend, see you again! Take care and come back.',
      mood: 'happy',
    };
  }

  // -------------------------------------------------------------------------
  // 16. NAME
  // -------------------------------------------------------------------------
  if (intent === 'NAME') {
    if (persona) {
      return {
        script: `ನಾನು ${persona.title}! ${persona.tagline}. ನಿಮಗೆ ಸಹಾಯ ಮಾಡ್ತೀನಿ.`,
        kanglish: `Naanu ${persona.title}! ${persona.tagline}. Nimage sahaaya maadtini.${englishNudge}`,
        english: `I am the ${persona.title}! ${persona.tagline}. I am here to help you.`,
        mood: 'happy',
      };
    }
    return {
      script: 'ನನ್ನ ಹೆಸರು ಅಣ್ಣ! ನಿಮ್ಮ ಬೆಂಗಳೂರು ಲೋಕಲ್ ಫ್ರೆಂಡ್.',
      kanglish: `Nanna hesaru Anna! Nimma Bengaluru local friend.${englishNudge}`,
      english: 'My name is Anna! Your Bengaluru local friend.',
      mood: 'happy',
    };
  }

  // -------------------------------------------------------------------------
  // 17. DYNAMIC ENGLISH-TO-KANGLISH FALLBACK: Directly addresses whatever
  //     the user wrote in English (never a static bluff)
  // -------------------------------------------------------------------------
  return buildDynamicEnglishReply(cleanedText, persona);
}

const ENGLISH_TO_KANNADA_LEXICON: Array<{
  pattern: RegExp;
  en: string;
  kanglish: string;
  script: string;
}> = [
  { pattern: /\b(water|drinking water)\b/i, en: 'water', kanglish: 'neeru', script: 'ನೀರು' },
  { pattern: /\b(cold|chilled|cool)\b/i, en: 'cold', kanglish: 'thanna', script: 'ತಣ್ಣ' },
  { pattern: /\b(hot|warm)\b/i, en: 'hot', kanglish: 'bisi', script: 'ಬಿಸಿ' },
  { pattern: /\b(coffee|kaapi)\b/i, en: 'coffee', kanglish: 'filter kaapi', script: 'ಫಿಲ್ಟರ್ ಕಾಫಿ' },
  { pattern: /\b(tea|chai)\b/i, en: 'tea', kanglish: 'tea / chaha', script: 'ಟೀ / ಚಹಾ' },
  { pattern: /\b(milk)\b/i, en: 'milk', kanglish: 'haalu', script: 'ಹಾಲು' },
  { pattern: /\b(food|meal|lunch|dinner|eat)\b/i, en: 'food/meal', kanglish: 'oota', script: 'ಊಟ' },
  { pattern: /\b(breakfast|snack|tiffin)\b/i, en: 'breakfast/snack', kanglish: 'thindi', script: 'ತಿಂಡಿ' },
  { pattern: /\b(rice)\b/i, en: 'rice', kanglish: 'anna', script: 'ಅನ್ನ' },
  { pattern: /\b(sugar)\b/i, en: 'sugar', kanglish: 'sakkare', script: 'ಸಕ್ಕರೆ' },
  { pattern: /\b(salt)\b/i, en: 'salt', kanglish: 'uppu', script: 'ಉಪ್ಪು' },
  { pattern: /\b(money|cash)\b/i, en: 'money', kanglish: 'duddu', script: 'ದುಡ್ಡು' },
  { pattern: /\b(house|home|room|flat)\b/i, en: 'house/room', kanglish: 'mane', script: 'ಮನೆ' },
  { pattern: /\b(work|office|job)\b/i, en: 'work/office', kanglish: 'kelsa / office', script: 'ಕೆಲಸ / ಆಫೀಸ್' },
  { pattern: /\b(friend|bro|buddy|brother)\b/i, en: 'friend', kanglish: 'guru / dosti', script: 'ಗುರು / ದೋಸ್ತಿ' },
  { pattern: /\b(today)\b/i, en: 'today', kanglish: 'ivattu', script: 'ಇವತ್ತು' },
  { pattern: /\b(tomorrow)\b/i, en: 'tomorrow', kanglish: 'naale', script: 'ನಾಳೆ' },
  { pattern: /\b(now|right now|immediately)\b/i, en: 'right now', kanglish: 'eegle', script: 'ಈಗಲೇ' },
  { pattern: /\b(fast|quick|quickly|hurry)\b/i, en: 'quickly', kanglish: 'bega', script: 'ಬೇಗ' },
  { pattern: /\b(slow|slowly)\b/i, en: 'slowly', kanglish: 'nidhaana', script: 'ನಿಧಾನ' },
  { pattern: /\b(good|nice|great|awesome)\b/i, en: 'very good', kanglish: 'chennagide / sakkath', script: 'ಚೆನ್ನಾಗಿದೆ / ಸಕ್ಕತ್' },
  { pattern: /\b(new|beginner)\b/i, en: 'new', kanglish: 'hosa', script: 'ಹೊಸ' },
  { pattern: /\b(road|street|way)\b/i, en: 'road/way', kanglish: 'daari / road', script: 'ದಾರಿ / ರೋಡ್' },
  { pattern: /\b(ticket)\b/i, en: 'ticket', kanglish: 'ticket', script: 'ಟಿಕೆಟ್' },
  { pattern: /\b(medicine|tablet|pill)\b/i, en: 'medicine', kanglish: 'maatre / medicine', script: 'ಮಾತ್ರೆ / ಮೆಡಿಸಿನ್' },
  { pattern: /\b(doctor|hospital)\b/i, en: 'hospital/doctor', kanglish: 'aaspatre / doctor', script: 'ಆಸ್ಪತ್ರೆ / ಡಾಕ್ಟರ್' },
];

export function buildDynamicEnglishReply(
  rawText: string,
  persona: ScenarioCard | null = null
): PersonaReply {
  const clean = (rawText || '').trim();
  const lower = clean.toLowerCase();
  const roleTitle = persona?.title || 'Anna';

  // Find up to 2 matching keywords in the user's English sentence
  const matchedWords = ENGLISH_TO_KANNADA_LEXICON.filter((entry) =>
    entry.pattern.test(lower)
  ).slice(0, 2);

  // 1. If user asked "Can I..." / "May I..." / "Is it possible..."
  if (/^(can\s+i|may\s+i|could\s+i|can\s+we|is\s+it\s+okay)/i.test(lower)) {
    if (matchedWords.length > 0) {
      const w = matchedWords[0];
      return {
        script: `${w.script} ಕೊಡಿ`,
        kanglish: `"${w.kanglish} kodi" (${w.script} ಕೊಡಿ)\nMeans "give me ${w.en}" — '${w.kanglish}' = ${w.en}, 'kodi' = give.`,
        english: '',
        mood: 'happy',
      };
    }
    return {
      script: 'ನಾನು ಮಾಡಬಹುದಾ?',
      kanglish: `"Naanu maadabahuda?" (ನಾನು ಮಾಡಬಹುದಾ?)\nMeans "can I do this?" — 'naanu' = I, 'maadabahuda' = can do.`,
      english: '',
      mood: 'happy',
    };
  }

  // 2. If user asked "Do you have..." / "Is there..." / "Are there..."
  if (/^(do\s+you\s+have|have\s+you\s+got|is\s+there|are\s+there|do\s+we\s+get)/i.test(lower)) {
    if (matchedWords.length > 0) {
      const w = matchedWords[0];
      return {
        script: `${w.script} ಇದೆಯಾ?`,
        kanglish: `"${w.kanglish} ideya?" (${w.script} ಇದೆಯಾ?)\nMeans "do you have ${w.en}?" — '${w.kanglish}' = ${w.en}, 'ideya' = is there.`,
        english: '',
        mood: 'excited',
      };
    }
    return {
      script: 'ಇದು ಇದೆಯಾ?',
      kanglish: `"Idu ideya?" (ಇದು ಇದೆಯಾ?)\nMeans "is this available?" — 'idu' = this, 'ideya' = is there.`,
      english: '',
      mood: 'happy',
    };
  }

  // 3. If user wrote "I am..." / "I'm..." (e.g., "I am new here", "I am hungry", "I am going to...")
  if (/^(i\s+am|i'm|im)\b/i.test(lower)) {
    if (/\b(new|learning|beginner|student|from)\b/i.test(lower)) {
      return {
        script: 'ನಾನು ಇಲ್ಲಿ ಹೊಸಬ',
        kanglish: `"Naanu illi hosaba" (ನಾನು ಇಲ್ಲಿ ಹೊಸಬ)\nMeans "I am new here" — 'naanu' = I, 'illi' = here, 'hosaba' = newcomer.`,
        english: '',
        mood: 'excited',
      };
    }
    if (/\b(hungry|starving|thirsty|tired)\b/i.test(lower)) {
      return {
        script: 'ನನಗೆ ಹಸಿವಾಗಿದೆ',
        kanglish: `"Nanage hasivaagide" (ನನಗೆ ಹಸಿವಾಗಿದೆ)\nMeans "I am hungry" — 'nanage' = to me, 'hasivaagide' = feeling hungry.`,
        english: '',
        mood: 'happy',
      };
    }
    return {
      script: 'ನಾನು ರೆಡಿ ಇದ್ದೀನಿ',
      kanglish: `"Naanu ready iddini" (ನಾನು ರೆಡಿ ಇದ್ದೀನಿ)\nMeans "I am ready" — 'naanu' = I, 'ready iddini' = am ready.`,
      english: '',
      mood: 'happy',
    };
  }

  // 4. If user matched vocabulary words from our lexicon (teach ONE short phrase only)
  if (matchedWords.length > 0) {
    const w1 = matchedWords[0];
    return {
      script: `ಒಂದು ${w1.script} ಕೊಡಿ`,
      kanglish: `"Ondu ${w1.kanglish} kodi" (ಒಂದು ${w1.script} ಕೊಡಿ)\nMeans "give me one ${w1.en}" — 'ondu' = one, '${w1.kanglish}' = ${w1.en}, 'kodi' = give.`,
      english: '',
      mood: 'happy',
    };
  }

  // 5. If user asked any WH-question (what, why, when, where, how, which, who)
  if (/^(what|why|when|where|how|which|who)\b|\?$/i.test(lower)) {
    return {
      script: 'ಇದಕ್ಕೆ ಎಷ್ಟು?',
      kanglish: `"Idakke eshtu?" (ಇದಕ್ಕೆ ಎಷ್ಟು?)\nMeans "how much for this?" — 'idakke' = for this, 'eshtu' = how much. Ask ${roleTitle} directly!`,
      english: '',
      mood: 'happy',
    };
  }

  // 6. General statement -> ONE short beginner phrase + word-by-word breakdown
  return {
    script: 'ನನಗೆ ಇದು ಬೇಕು',
    kanglish: `"Nanage idu beku" (ನನಗೆ ಇದು ಬೇಕು)\nMeans "I want this" — 'nanage' = to me, 'idu' = this, 'beku' = want.`,
    english: '',
    mood: 'happy',
  };
}
