import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Volume2,
  Check,
  X,
  Mic,
  RotateCcw,
  ArrowRight,
  Layers,
  Target,
  StickyNote,
  Bell,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Situation, playTactileTone } from '../data/kanglishData';
import {
  COURSE_UNITS,
  isLevelUnlocked,
} from '../data/courseData';
import {
  speakKannada,
  cancelKannadaSpeech,
  abortActiveRecognition,
  useSpeakingState,
  scoreSpeechAttempt,
  startKannadaSpeechRecognition,
  detectSpeechSupport,
  SpeechSupportState,
  MicButtonState,
  SpeechErrorKind,
} from '../utils/speechUtils';
import { useProgress } from '../store/progressStore';
import {
  scoreSpeakAttempt,
  ANNA_UNVERIFIED_MESSAGE,
} from '../voice/anna-brain';
import { speakScript } from '../voice/anna-mouth';
import { AnnaMascot } from './AnnaMascot';
import { Mascot, MASCOT_PLACEMENTS } from './Mascot';
import { CreateNewDisclosure, type CreateKind } from './goals/CreateNewDisclosure';
import { GoalComposer } from './goals/GoalComposer';
import { GoalTaskList, type GoalTask, GOAL_ACCENT } from './goals/GoalTaskList';
import { loadGoals, saveGoals, dueLabel, makeId, type Goal } from '../lib/goals';
import { SCENARIOS } from '../data/scenarios';
import { cn } from '../lib/utils';
import { ScratchCard } from '@/components/practice/ScratchCard';
import { DeckRotateButton } from '@/components/practice/DeckRotateButton';
import { NeuralGridBg } from '@/components/ui/NeuralGridBg';
import { StreakCard } from './practice/StreakCard';
import { markActiveToday } from '@/lib/streak';
import { getOnboarding } from '@/lib/onboarding';
import { STRINGS } from '@/lib/i18n';
import {
  mulberry32,
  normalizeForKey,
  sampleRoundWithHistory,
} from '@/lib/practice/sampler';
import {
  FlashcardDecksHeaderBackdropDoodle,
  ProfileCardBackdropDoodle,
} from './UnitBackgroundDoodles';
import {
  FlashcardTopicCarousel,
  FlashcardStudyCarousel,
} from './practice/FlashcardInteractiveCarousel';

const ONBOARDING_GOAL_LABELS: Record<string, string> = {
  order_food: STRINGS.practice.goalOrderFood,
  autos_buses: STRINGS.practice.goalAutosBuses,
  friends: STRINGS.practice.goalFriends,
  work: STRINGS.practice.goalWork,
  travel: STRINGS.practice.goalTravel,
};

interface LessonAndSpeakScreenProps {
  situation: Situation;
  initialMode: 'lesson' | 'speak' | 'flashcards';
  onBack: () => void;
  onCompleteLesson: (
    situationId: string,
    earnedXp: number,
    phrasesLearned: number
  ) => void;
  onOpenRoleplay?: (situationId: string) => void;
  onOpenPhrasebook?: () => void;
}

export interface VoiceDeckPhrase {
  id: string;
  kannada: string;
  translit: string;
  meaning: string;
  unitTitle: string;
  unitEmoji: string;
  unitId: string;
  phase: number;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
}

interface FlashcardTopicDef {
  id: string;
  title: string;
  icon: string;
  description: string;
  keywords: string[];
  unitIds: string[];
}

const FLASHCARD_TOPICS: FlashcardTopicDef[] = [
  {
    id: 'greetings',
    title: 'Greetings',
    icon: '👋',
    description: 'Introductions & polite phrases',
    keywords: ['namaskara', 'hegiddira', 'chennagidini', 'hesaru', 'dhanyavada', 'dayavittu'],
    unitIds: ['u1', 'u2', 'u3', 'survival'],
  },
  {
    id: 'metro',
    title: 'Namma Metro',
    icon: '🚇',
    description: 'Metro stations, tokens & platforms',
    keywords: ['metro', 'platform', 'nildana', 'token', 'purple line', 'green line'],
    unitIds: ['metro'],
  },
  {
    id: 'bus',
    title: 'BMTC Bus',
    icon: '🚌',
    description: 'Bus stops, conductor & tickets',
    keywords: ['bus', 'bmtc', 'conductor', 'bus stop', 'majestic'],
    unitIds: ['bus'],
  },
  {
    id: 'rickshaw',
    title: 'Auto Rickshaw',
    icon: '🛺',
    description: 'Auto rides, meter & hailing',
    keywords: ['auto', 'meter', 'bidthira', 'hathkoli'],
    unitIds: ['u16', 'u21', 'u22', 'u23', 'u25', 'auto'],
  },
  {
    id: 'food',
    title: 'Darshini & Food',
    icon: '🍽️',
    description: 'Masala dosa, idli & meals',
    keywords: ['oota', 'dosa', 'dose', 'idli', 'sambar', 'chutney', 'thindi'],
    unitIds: ['u5', 'u9', 'u10', 'u15', 'food'],
  },
  {
    id: 'kaapi',
    title: 'Filter Kaapi & Tea',
    icon: '☕',
    description: 'Filter coffee, chai, coconut & water',
    keywords: ['kaapi', 'coffee', 'tea', 'chai', 'elaneeru', 'neeru', 'haalu'],
    unitIds: ['u6', 'kaapi'],
  },
  {
    id: 'directions',
    title: 'Directions',
    icon: '🧭',
    description: 'Left, right, straight & places',
    keywords: ['illi', 'alli', 'elli', 'edagade', 'balagade', 'neravagi', 'u-turn'],
    unitIds: ['u7', 'u14', 'u19'],
  },
  {
    id: 'traffic',
    title: 'Traffic & Signals',
    icon: '🚦',
    description: 'Signals, flyovers & road junctions',
    keywords: ['signal', 'flyover', 'traffic', 'circle', 'cross'],
    unitIds: ['u20', 'traffic'],
  },
  {
    id: 'shopping',
    title: 'Shopping & UPI',
    icon: '🛍️',
    description: 'Street bazaar, bargaining & UPI',
    keywords: ['angadi', 'upi', 'chillare', 'kammi', 'discount', 'eshtu aaytu'],
    unitIds: ['u11', 'shopping'],
  },
  {
    id: 'numbers',
    title: 'Numbers',
    icon: '🔢',
    description: 'Counting 1 to 100 in Kannada',
    keywords: ['ondu', 'eradu', 'mooru', 'naalku', 'aidu', 'hatthu', 'ippatthu', 'nooru'],
    unitIds: ['u4', 'numbers'],
  },
  {
    id: 'family',
    title: 'Family & Friends',
    icon: '👨‍👩‍👧',
    description: 'People, relations & friends',
    keywords: ['amma', 'appa', 'anna', 'akka', 'friend', 'namma', 'nimma'],
    unitIds: ['u8', 'u12', 'u13'],
  },
  {
    id: 'home',
    title: 'Home & Delivery',
    icon: '🏠',
    description: 'Apartment, gate, water can & parcels',
    keywords: ['flat', 'delivery', 'gate', 'water can', 'security'],
    unitIds: ['flat', 'delivery', 'home'],
  },
  {
    id: 'office',
    title: 'Tech Park & Work',
    icon: '💻',
    description: 'Office meetings, calls & daily work',
    keywords: ['office', 'kelasa', 'meeting', 'laptop', 'work maadi'],
    unitIds: ['u17', 'office'],
  },
  {
    id: 'rain',
    title: 'Weather & Rain',
    icon: '🌧️',
    description: 'Bengaluru evening rain & weather',
    keywords: ['male', 'rain', 'chhatri', 'umbrella', 'bisi', 'chali'],
    unitIds: ['u24', 'rain'],
  },
  {
    id: 'time',
    title: 'Time & Days',
    icon: '🕐',
    description: 'Clock hours, today, tomorrow & week',
    keywords: ['gante', 'ghante', 'ivattu', 'naale', 'ninne', 'beligge', 'raatri'],
    unitIds: ['u26', 'u27', 'u28'],
  },
  {
    id: 'opinions',
    title: 'Opinions & Slang',
    icon: '❤️',
    description: 'Likes, emotions & Bengaluru slang',
    keywords: ['ishta', 'chennagide', 'sakkath', 'sulabha', 'kasta', 'santhosha'],
    unitIds: ['u18', 'u29', 'u30'],
  },
];

const CONTEXTUAL_FLASHCARD_PHRASES: VoiceDeckPhrase[] = [
  // Namma Metro cards (unitId: 'metro')
  {
    id: 'fc-metro-1',
    kannada: 'ಮೆಟ್ರೋ ಸ್ಟೇಷನ್ ಎಲ್ಲಿದೆ?',
    translit: 'Metro station ellide?',
    meaning: 'Where is the Metro station?',
    unitTitle: 'Namma Metro',
    unitEmoji: '🚇',
    unitId: 'metro',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'fc-metro-2',
    kannada: 'ಇಂದಿರಾನಗರಕ್ಕೆ ಒಂದು ಮೆಟ್ರೋ ಟೋಕನ್ ಕೊಡಿ',
    translit: 'Indiranagara-kke ondu metro token kodi',
    meaning: 'Give me one Metro token to Indiranagar',
    unitTitle: 'Namma Metro',
    unitEmoji: '🚇',
    unitId: 'metro',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'fc-metro-3',
    kannada: 'ಪರ್ಪಲ್ ಲೈನ್ ಮೆಟ್ರೋ ಯಾವ ಪ್ಲಾಟ್‌ಫಾರ್ಮ್?',
    translit: 'Purple line metro yaava platform?',
    meaning: 'Which platform is the Purple Line Metro?',
    unitTitle: 'Namma Metro',
    unitEmoji: '🚇',
    unitId: 'metro',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'fc-metro-4',
    kannada: 'ಮುಂದಿನ ನಿಲ್ದಾಣ ಮೆಜೆಸ್ಟಿಕ್ ಮೆಟ್ರೋ',
    translit: 'Mundina nildana Majestic Metro',
    meaning: 'The next station is Majestic Metro',
    unitTitle: 'Namma Metro',
    unitEmoji: '🚇',
    unitId: 'metro',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'fc-metro-5',
    kannada: 'ಈ ಮೆಟ್ರೋ ರೈಲು ಎಂ.ಜಿ. ರಸ್ತೆಗೆ ಹೋಗುತ್ತಾ?',
    translit: 'Ee metro railu MG Raste-ge hogutta?',
    meaning: 'Does this Metro train go to MG Road?',
    unitTitle: 'Namma Metro',
    unitEmoji: '🚇',
    unitId: 'metro',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'fc-metro-6',
    kannada: 'ಗ್ರೀನ್ ಲೈನ್ ಮೆಟ್ರೋಗೆ ಇಲ್ಲಿ ಬದಲಾಯಿಸಬೇಕಾ?',
    translit: 'Green line metro-ge illi badalaayisabeka?',
    meaning: 'Do I change here for the Green Line Metro?',
    unitTitle: 'Namma Metro',
    unitEmoji: '🚇',
    unitId: 'metro',
    phase: 2,
    difficulty: 'Moderate',
  },
  {
    id: 'fc-metro-7',
    kannada: 'ಕಬ್ಬನ್ ಪಾರ್ಕ್ ಮೆಟ್ರೋ ಎಕ್ಸಿಟ್ ಯಾವ ಕಡೆ?',
    translit: 'Cubbon Park metro exit yaava kade?',
    meaning: 'Which way is the Cubbon Park Metro exit?',
    unitTitle: 'Namma Metro',
    unitEmoji: '🚇',
    unitId: 'metro',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'fc-metro-8',
    kannada: 'ಮೆಟ್ರೋ ಕಾರ್ಡ್ ರೀಚಾರ್ಜ್ ಮಾಡಬೇಕು',
    translit: 'Metro card recharge maadabeku',
    meaning: 'I need to recharge my Metro smart card',
    unitTitle: 'Namma Metro',
    unitEmoji: '🚇',
    unitId: 'metro',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'fc-metro-9',
    kannada: 'ಕೊನೆಯ ಮೆಟ್ರೋ ರೈಲು ಎಷ್ಟು ಗಂಟೆಗೆ?',
    translit: 'Koneya metro railu eshtu gante-ge?',
    meaning: 'What time is the last Metro train?',
    unitTitle: 'Namma Metro',
    unitEmoji: '🚇',
    unitId: 'metro',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'fc-metro-10',
    kannada: 'ಮೆಟ್ರೋ ಬಾಗಿಲು ಮುಚ್ಚುತ್ತಿದೆ, ಹಿಂದೆ ನಿಲ್ಲಿ',
    translit: 'Metro baagilu muchuttide, hinde nilli',
    meaning: 'The Metro doors are closing, please stand back',
    unitTitle: 'Namma Metro',
    unitEmoji: '🚇',
    unitId: 'metro',
    phase: 2,
    difficulty: 'Moderate',
  },
  // BMTC Bus cards (unitId: 'bus')
  {
    id: 'fc-bus-1',
    kannada: 'ಈ ಬಸ್ ಕೋರಮಂಗಲಕ್ಕೆ ಹೋಗುತ್ತಾ?',
    translit: 'Ee bus Koramangala-kke hogutta?',
    meaning: 'Does this BMTC bus go to Koramangala?',
    unitTitle: 'BMTC Bus',
    unitEmoji: '🚌',
    unitId: 'bus',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'fc-bus-2',
    kannada: 'ಮುಂದಿನ ಬಸ್ ಸ್ಟಾಪ್‌ನಲ್ಲಿ ಇಳಿಸಿ ಅಣ್ಣ',
    translit: 'Mundina bus stop-nalli ilisi anna',
    meaning: 'Please drop me at the next bus stop, brother',
    unitTitle: 'BMTC Bus',
    unitEmoji: '🚌',
    unitId: 'bus',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'fc-bus-3',
    kannada: 'ಕಂಡಕ್ಟರ್ ಸರ್, ಮೆಜೆಸ್ಟಿಕ್‌ಗೆ ಎರಡು ಟಿಕೆಟ್ ಕೊಡಿ',
    translit: 'Conductor sir, Majestic-ge eradu ticket kodi',
    meaning: 'Conductor sir, give two bus tickets to Majestic',
    unitTitle: 'BMTC Bus',
    unitEmoji: '🚌',
    unitId: 'bus',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'fc-bus-4',
    kannada: 'ಬಸ್ ಸ್ಟಾಪ್ ಇಲ್ಲಿಂದ ಎಷ್ಟು ದೂರ?',
    translit: 'Bus stop illinda eshtu doora?',
    meaning: 'How far is the bus stop from here?',
    unitTitle: 'BMTC Bus',
    unitEmoji: '🚌',
    unitId: 'bus',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'fc-bus-5',
    kannada: 'ಸಿಲ್ಕ್ ಬೋರ್ಡ್ ಬಸ್ ಯಾವ ಪ್ಲಾಟ್‌ಫಾರ್ಮ್‌ಗೆ ಬರುತ್ತೆ?',
    translit: 'Silk Board bus yaava platform-ge barutte?',
    meaning: 'Which platform does the Silk Board bus arrive at?',
    unitTitle: 'BMTC Bus',
    unitEmoji: '🚌',
    unitId: 'bus',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'fc-bus-6',
    kannada: 'ಅಣ್ಣ, ಹಿಂದೆ ಬಾಗಿಲಿಂದ ಹತ್ತಿ',
    translit: 'Anna, hinde baagilinda hatti',
    meaning: 'Brother, please board from the rear door',
    unitTitle: 'BMTC Bus',
    unitEmoji: '🚌',
    unitId: 'bus',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'fc-bus-7',
    kannada: 'ಈ ಬಸ್ ಜಯನಗರ ನಾಲ್ಕನೇ ಬ್ಲಾಕ್‌ಗೆ ಹೋಗುತ್ತಾ?',
    translit: 'Ee bus Jayanagara naalkane block-ge hogutta?',
    meaning: 'Does this bus go to Jayanagar 4th Block?',
    unitTitle: 'BMTC Bus',
    unitEmoji: '🚌',
    unitId: 'bus',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'fc-bus-8',
    kannada: 'ಬಸ್ ಪಾಸ್ ತೋರಿಸಿ ಸಾಕು',
    translit: 'Bus pass thorisi saaku',
    meaning: 'Just show your bus pass, that is enough',
    unitTitle: 'BMTC Bus',
    unitEmoji: '🚌',
    unitId: 'bus',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'fc-bus-9',
    kannada: 'ಏರ್‌ಪೋರ್ಟ್ ವೋಲ್ವೋ ಬಸ್ ಎಲ್ಲಿ ನಿಲ್ಲುತ್ತೆ?',
    translit: 'Airport Volvo bus elli nillutte?',
    meaning: 'Where does the Airport Volvo bus stop?',
    unitTitle: 'BMTC Bus',
    unitEmoji: '🚌',
    unitId: 'bus',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'fc-bus-10',
    kannada: 'ಮುಂದೆ ಸೀಟ್ ಖಾಲಿ ಇದೆ, ಕೂತ್ಕೊಳ್ಳಿ',
    translit: 'Munde seat khaali ide, kootkoli',
    meaning: 'There is an empty seat in front, please sit down',
    unitTitle: 'BMTC Bus',
    unitEmoji: '🚌',
    unitId: 'bus',
    phase: 1,
    difficulty: 'Easy',
  },
  // Filter Kaapi, Traffic, Rain & Office cards
  {
    id: 'fc-kaapi-1',
    kannada: 'ಅಣ್ಣ, ಒಂದು ಸ್ಟ್ರಾಂಗ್ ಫಿಲ್ಟರ್ ಕಾಫಿ ಕೊಡಿ',
    translit: 'Anna, ondu strong filter kaapi kodi',
    meaning: 'Brother, give me one strong filter coffee',
    unitTitle: 'Filter Kaapi & Tea',
    unitEmoji: '☕',
    unitId: 'kaapi',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'fc-kaapi-2',
    kannada: 'ಕಾಫಿಯಲ್ಲಿ ಸಕ್ಕರೆ ಸ್ವಲ್ಪ ಕಮ್ಮಿ ಹಾಕಿ',
    translit: 'Kaapi-yalli sakkare swalpa kammi haaki',
    meaning: 'Put a little less sugar in the coffee',
    unitTitle: 'Filter Kaapi & Tea',
    unitEmoji: '☕',
    unitId: 'kaapi',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'fc-traffic-1',
    kannada: 'ಮುಂದಿನ ಟ್ರಾಫಿಕ್ ಸಿಗ್ನಲ್ ಹತ್ರ ಎಡಕ್ಕೆ ತಿರುಗಿ',
    translit: 'Mundina traffic signal hatra edakke thirugi',
    meaning: 'Turn left near the next traffic signal',
    unitTitle: 'Traffic & Signals',
    unitEmoji: '🚦',
    unitId: 'traffic',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'fc-traffic-2',
    kannada: 'ಫ್ಲೈಓವರ್ ಮೇಲೆ ಹೋಗಬೇಡಿ, ಕೆಳಗಡೆ ಹೋಗಿ',
    translit: 'Flyover mele hogabedi, kelagade hogi',
    meaning: 'Do not go over the flyover, take the service road below',
    unitTitle: 'Traffic & Signals',
    unitEmoji: '🚦',
    unitId: 'traffic',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'fc-rain-1',
    kannada: 'ಇವತ್ತು ಸಂಜೆ ಜೋರು ಮಳೆ ಬರುತ್ತೆ ಅನಿಸುತ್ತೆ',
    translit: 'Ivattu sanje joru male barutte anisutte',
    meaning: 'It looks like heavy rain is coming this evening',
    unitTitle: 'Weather & Rain',
    unitEmoji: '🌧️',
    unitId: 'rain',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'fc-office-1',
    kannada: 'ನನಗೆ ಈಗ ಆಫೀಸ್ ಮೀಟಿಂಗ್ ಇದೆ, ಆಮೇಲೆ ಕಾಲ್ ಮಾಡ್ತೀನಿ',
    translit: 'Nanage iga office meeting ide, aamele call maadtini',
    meaning: 'I have an office meeting now, I will call later',
    unitTitle: 'Tech Park & Work',
    unitEmoji: '💻',
    unitId: 'office',
    phase: 1,
    difficulty: 'Easy',
  },
  // Numbers & Counting (unitId: 'numbers')
  {
    id: 'fc-num-30',
    kannada: 'ಮೂವತ್ತು (೩೦)',
    translit: 'Muvattu',
    meaning: '30 (Thirty)',
    unitTitle: 'Numbers 1–100',
    unitEmoji: '🔢',
    unitId: 'numbers',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'fc-num-40',
    kannada: 'ನಲವತ್ತು (೪೦)',
    translit: 'Nalavattu',
    meaning: '40 (Forty)',
    unitTitle: 'Numbers 1–100',
    unitEmoji: '🔢',
    unitId: 'numbers',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'fc-num-50',
    kannada: 'ಐವತ್ತು (೫೦)',
    translit: 'Aivattu',
    meaning: '50 (Fifty)',
    unitTitle: 'Numbers 1–100',
    unitEmoji: '🔢',
    unitId: 'numbers',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'fc-num-100',
    kannada: 'ನೂರು (೧೦೦)',
    translit: 'Nooru',
    meaning: '100 (One Hundred)',
    unitTitle: 'Numbers 1–100',
    unitEmoji: '🔢',
    unitId: 'numbers',
    phase: 1,
    difficulty: 'Easy',
  },
];

interface SpeakDeckCategoryDef {
  id: string;
  label: string;
  emoji: string;
}

const DAILY_LIFE_SPEAK_CATEGORIES: SpeakDeckCategoryDef[] = [
  { id: 'all', label: 'All Daily Life', emoji: '🌟' },
  { id: 'survival', label: 'Language Survival', emoji: '🗣️' },
  { id: 'auto', label: 'Auto & Commute', emoji: '🛺' },
  { id: 'delivery', label: 'Delivery & Gate', emoji: '📦' },
  { id: 'food', label: 'Darshini & Food', emoji: '🍽️' },
  { id: 'shopping', label: 'Shop & UPI', emoji: '🛒' },
  { id: 'flat', label: 'Flat & Daily Help', emoji: '🏠' },
  { id: 'curriculum', label: 'Lesson Sentences', emoji: '📚' },
];

const DAILY_LIFE_SPEAK_SENTENCES: VoiceDeckPhrase[] = [
  // 1. Language Survival (for non-Kannada speakers)
  {
    id: 'dl-surv-1',
    kannada: 'ನಂಗೆ ಸ್ವಲ್ಪ ಸ್ವಲ್ಪ ಕನ್ನಡ ಬರುತ್ತೆ',
    translit: 'Nange swalpa swalpa Kannada barutte',
    meaning: 'I know a little bit of Kannada',
    unitTitle: 'Language Survival',
    unitEmoji: '🗣️',
    unitId: 'survival',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'dl-surv-2',
    kannada: 'ನಾನು ಕನ್ನಡ ಕಲೀತಾ ಇದ್ದೀನಿ',
    translit: 'Naanu Kannada kalitha iddini',
    meaning: 'I am learning Kannada right now',
    unitTitle: 'Language Survival',
    unitEmoji: '🗣️',
    unitId: 'survival',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'dl-surv-3',
    kannada: 'ದಯವಿಟ್ಟು ಸ್ವಲ್ಪ ನಿಧಾನವಾಗಿ ಮಾತಾಡಿ',
    translit: 'Dayavittu swalpa nidhanavaagi maathadi',
    meaning: 'Please speak a little slowly',
    unitTitle: 'Language Survival',
    unitEmoji: '🗣️',
    unitId: 'survival',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'dl-surv-4',
    kannada: 'ಇದನ್ನು ಕನ್ನಡದಲ್ಲಿ ಹೇಗೆ ಹೇಳೋದು?',
    translit: 'Idannu Kannada-dalli hege helodu?',
    meaning: 'How do you say this in Kannada?',
    unitTitle: 'Language Survival',
    unitEmoji: '🗣️',
    unitId: 'survival',
    phase: 2,
    difficulty: 'Moderate',
  },
  {
    id: 'dl-surv-5',
    kannada: 'ನಿಮ್ಮ ಸಹಾಯಕ್ಕೆ ತುಂಬಾ ಧನ್ಯವಾದಗಳು',
    translit: 'Nimma sahayake tumbha dhanyavadagalu',
    meaning: 'Thank you very much for your help',
    unitTitle: 'Language Survival',
    unitEmoji: '🗣️',
    unitId: 'survival',
    phase: 1,
    difficulty: 'Easy',
  },

  // 2. Auto, Cab & Daily Commute
  {
    id: 'dl-auto-1',
    kannada: 'ಅಣ್ಣ, ಇಂದಿರಾನಗರಕ್ಕೆ ಬಿಡ್ತೀರಾ?',
    translit: 'Anna, Indiranagar-ge bidthira?',
    meaning: 'Brother, will you drop me to Indiranagar?',
    unitTitle: 'Auto & Commute',
    unitEmoji: '🛺',
    unitId: 'auto',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'dl-auto-2',
    kannada: 'ಮೀಟರ್ ಹಾಕಿ ಅಣ್ಣ, ಎಕ್ಸ್ಟ್ರಾ ಕೊಡ್ತೀನಿ',
    translit: 'Meter haaki anna, extra kodthini',
    meaning: 'Please put on the meter brother, I will pay extra',
    unitTitle: 'Auto & Commute',
    unitEmoji: '🛺',
    unitId: 'auto',
    phase: 2,
    difficulty: 'Moderate',
  },
  {
    id: 'dl-auto-3',
    kannada: 'ಇಲ್ಲಿ ಮುಂದೆ ಎಡಗಡೆ ತಗೊಳ್ಳಿ',
    translit: 'Illi mundhe edagade thagoli',
    meaning: 'Take a left turn just ahead here',
    unitTitle: 'Auto & Commute',
    unitEmoji: '🛺',
    unitId: 'auto',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'dl-auto-4',
    kannada: 'ಗೇಟ್ ಹತ್ರನೇ ನಿಲ್ಲಿಸಿ ಸಾಕು',
    translit: 'Gate hatra ne nillisi saaku',
    meaning: 'Just stop right near the gate, that is enough',
    unitTitle: 'Auto & Commute',
    unitEmoji: '🛺',
    unitId: 'auto',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'dl-auto-5',
    kannada: 'ಮ್ಯಾಪ್ ತೋರಿಸ್ತಾ ಇದೆ, ನೇರವಾಗಿ ಹೋಗಿ',
    translit: 'Map thoristha idhe, neravaagi hogi',
    meaning: 'The map is showing the route, go straight ahead',
    unitTitle: 'Auto & Commute',
    unitEmoji: '🛺',
    unitId: 'auto',
    phase: 2,
    difficulty: 'Moderate',
  },
  {
    id: 'dl-auto-6',
    kannada: 'ಮೆಟ್ರೋ ಸ್ಟೇಷನ್‌ಗೆ ಎಷ್ಟು ಆಗುತ್ತೆ ಅಣ್ಣ?',
    translit: 'Metro station-ge eshtu aagutte anna?',
    meaning: 'How much will it cost to the Metro station, brother?',
    unitTitle: 'Auto & Commute',
    unitEmoji: '🛺',
    unitId: 'auto',
    phase: 1,
    difficulty: 'Easy',
  },

  // 3. Swiggy, Zomato, Courier & Gate Directions
  {
    id: 'dl-deliv-1',
    kannada: 'ಅಣ್ಣ, ಮೇನ್ ಗೇಟ್ ಹತ್ರ ಬನ್ನಿ',
    translit: 'Anna, main gate hatra banni',
    meaning: 'Brother, please come near the main gate',
    unitTitle: 'Delivery & Gate',
    unitEmoji: '📦',
    unitId: 'delivery',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'dl-deliv-2',
    kannada: 'ಪಾರ್ಸೆಲ್ ಸೆಕ್ಯೂರಿಟಿ ಹತ್ರ ಕೊಡಿ',
    translit: 'Parcel security hatra kodi',
    meaning: 'Please hand over the parcel to the security guard',
    unitTitle: 'Delivery & Gate',
    unitEmoji: '📦',
    unitId: 'delivery',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'dl-deliv-3',
    kannada: 'ಎರಡನೇ ಫ್ಲೋರ್‌ಗೆ ಬನ್ನಿ, ಲಿಫ್ಟ್ ಇದೆ',
    translit: 'Eradane floor-ge banni, lift idhe',
    meaning: 'Come to the second floor, the lift is working',
    unitTitle: 'Delivery & Gate',
    unitEmoji: '📦',
    unitId: 'delivery',
    phase: 2,
    difficulty: 'Moderate',
  },
  {
    id: 'dl-deliv-4',
    kannada: 'ಮನೆ ಬಾಗಿಲು ಹತ್ರ ಇಡಿ, ನಾನು ಬರ್ತೀನಿ',
    translit: 'Mane baagilu hatra idi, naanu barthini',
    meaning: 'Leave it by the front door, I am coming',
    unitTitle: 'Delivery & Gate',
    unitEmoji: '📦',
    unitId: 'delivery',
    phase: 2,
    difficulty: 'Moderate',
  },
  {
    id: 'dl-deliv-5',
    kannada: 'ಲೊಕೇಶನ್ ಕಳಿಸಿದ್ದೀನಿ, ಆ ರಸ್ತೇಲಿ ಬನ್ನಿ',
    translit: 'Location kalisiddini, aa rasteli banni',
    meaning: 'I have sent the location, come along that road',
    unitTitle: 'Delivery & Gate',
    unitEmoji: '📦',
    unitId: 'delivery',
    phase: 2,
    difficulty: 'Moderate',
  },

  // 4. Darshini, Filter Coffee & Eating Out
  {
    id: 'dl-food-1',
    kannada: 'ಅಣ್ಣ, ಎರಡು ಮಸಾಲೆ ದೋಸೆ ಮತ್ತು ಒಂದು ಕಾಫಿ ಕೊಡಿ',
    translit: 'Anna, eradu masale dose mattu ondu kaapi kodi',
    meaning: 'Brother, give me two masala dosas and one coffee',
    unitTitle: 'Darshini & Food',
    unitEmoji: '🍽️',
    unitId: 'food',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'dl-food-2',
    kannada: 'ಕಾಫೀಲಿ ಸಕ್ಕರೆ ಕಮ್ಮಿ ಹಾಕಿ',
    translit: 'Kaapi-li sakkare kammi haaki',
    meaning: 'Please put less sugar in the coffee',
    unitTitle: 'Darshini & Food',
    unitEmoji: '🍽️',
    unitId: 'food',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'dl-food-3',
    kannada: 'ಊಟದಲ್ಲಿ ಖಾರ ಸ್ವಲ್ಪ ಕಮ್ಮಿ ಇರಲಿ',
    translit: 'Oota-dalli khaara swalpa kammi irali',
    meaning: 'Let the food be a little less spicy',
    unitTitle: 'Darshini & Food',
    unitEmoji: '🍽️',
    unitId: 'food',
    phase: 2,
    difficulty: 'Moderate',
  },
  {
    id: 'dl-food-4',
    kannada: 'ಕುಡಿಯೋಕೆ ಬಿಸಿ ನೀರು ಸಿಗುತ್ತಾ?',
    translit: 'Kudiyoke bisi neeru sigutta?',
    meaning: 'Can I get some warm water to drink?',
    unitTitle: 'Darshini & Food',
    unitEmoji: '🍽️',
    unitId: 'food',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'dl-food-5',
    kannada: 'ಇದನ್ನು ಪಾರ್ಸೆಲ್ ಮಾಡಿಕೊಡಿ ಅಣ್ಣ',
    translit: 'Idannu parcel maadikodi anna',
    meaning: 'Please pack this for takeaway, brother',
    unitTitle: 'Darshini & Food',
    unitEmoji: '🍽️',
    unitId: 'food',
    phase: 1,
    difficulty: 'Easy',
  },

  // 5. Grocery, Vegetable Vendors & UPI Payments
  {
    id: 'dl-shop-1',
    kannada: 'ಇದರ ಬೆಲೆ ಎಷ್ಟು ಅಣ್ಣ?',
    translit: 'Idara bele eshtu anna?',
    meaning: 'How much does this cost, brother?',
    unitTitle: 'Shop & UPI',
    unitEmoji: '🛒',
    unitId: 'shopping',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'dl-shop-2',
    kannada: 'ಫೋನ್‌ಪೇ ಅಥವಾ ಗೂಗಲ್ ಪೇ ನಡೆಯುತ್ತಾ?',
    translit: 'PhonePe athava Google Pay nadeyutta?',
    meaning: 'Do you accept PhonePe or Google Pay here?',
    unitTitle: 'Shop & UPI',
    unitEmoji: '🛒',
    unitId: 'shopping',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'dl-shop-3',
    kannada: 'ನನ್ನ ಹತ್ರ ಚಿಲ್ಲರೆ ಇಲ್ಲ, ಸ್ಕ್ಯಾನ್ ಮಾಡ್ತೀನಿ',
    translit: 'Nanna hatra chillare illa, scan maadthini',
    meaning: 'I do not have loose change, I will scan the QR code',
    unitTitle: 'Shop & UPI',
    unitEmoji: '🛒',
    unitId: 'shopping',
    phase: 2,
    difficulty: 'Moderate',
  },
  {
    id: 'dl-shop-4',
    kannada: 'ಸ್ವಲ್ಪ ಬೆಲೆ ಕಮ್ಮಿ ಮಾಡಿ ಅಕ್ಕ',
    translit: 'Swalpa bele kammi maadi akka',
    meaning: 'Sister, please reduce the price a little bit',
    unitTitle: 'Shop & UPI',
    unitEmoji: '🛒',
    unitId: 'shopping',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'dl-shop-5',
    kannada: 'ತಾಜಾ ತರಕಾರಿ ಕೊಡಿ, ಅರ್ಧ ಕಿಲೋ ಸಾಕು',
    translit: 'Taza tharakari kodi, ardha kilo saaku',
    meaning: 'Please give fresh vegetables, half a kilo is enough',
    unitTitle: 'Shop & UPI',
    unitEmoji: '🛒',
    unitId: 'shopping',
    phase: 2,
    difficulty: 'Moderate',
  },

  // 6. Flat, House Help, Power & Maintenance
  {
    id: 'dl-flat-1',
    kannada: 'ಅಕ್ಕ, ನಾಳೆ ಬೆಳಗ್ಗೆ ಎಂಟು ಗಂಟೆಗೆ ಬನ್ನಿ',
    translit: 'Akka, naale belagge entu ghantege banni',
    meaning: 'Sister, please come tomorrow morning at 8 o’clock',
    unitTitle: 'Flat & Daily Help',
    unitEmoji: '🏠',
    unitId: 'flat',
    phase: 2,
    difficulty: 'Moderate',
  },
  {
    id: 'dl-flat-2',
    kannada: 'ಇವತ್ತು ಮನೆ ಕೆಲಸ ಬೇಡ, ನಾಳೆ ಬನ್ನಿ',
    translit: 'Ivattu mane kelasa beda, naale banni',
    meaning: 'No housework needed today, please come tomorrow',
    unitTitle: 'Flat & Daily Help',
    unitEmoji: '🏠',
    unitId: 'flat',
    phase: 1,
    difficulty: 'Easy',
  },
  {
    id: 'dl-flat-3',
    kannada: 'ನಮ್ಮ ಮನೇಲಿ ಕರೆಂಟ್ ಹೋಗಿದೆ, ಯಾವಾಗ ಬರುತ್ತೆ?',
    translit: 'Namma maneli current hogide, yavaga barutte?',
    meaning: 'Power is out in our flat, when will it be back?',
    unitTitle: 'Flat & Daily Help',
    unitEmoji: '🏠',
    unitId: 'flat',
    phase: 2,
    difficulty: 'Moderate',
  },
  {
    id: 'dl-flat-4',
    kannada: 'ಕುಡಿಯುವ ನೀರಿನ ಕ್ಯಾನ್ ಮನೆಗೆ ಕೊಡಿ',
    translit: 'Kudiyuva neerina can manege kodi',
    meaning: 'Please deliver the drinking water can to the flat',
    unitTitle: 'Flat & Daily Help',
    unitEmoji: '🏠',
    unitId: 'flat',
    phase: 2,
    difficulty: 'Moderate',
  },
];

const TYPE_ICON: Record<Goal['type'], React.ReactNode> = {
  goal: <Target size={12} className="text-neutral-400" />,
  note: <StickyNote size={12} className="text-neutral-400" />,
  reminder: <Bell size={12} className="text-neutral-400" />,
};

const DUE_TONE: Record<string, string> = {
  overdue: 'text-red-600 font-medium',
  today: 'text-primary font-medium',
  soon: 'text-neutral-500',
  later: 'text-neutral-500',
};

function GoalMeta({ goal }: { goal: Goal }) {
  const due = dueLabel(goal);
  const scenario = goal.scenarioId
    ? SCENARIOS.find((s) => s.id === goal.scenarioId || s.id.includes(goal.scenarioId!))
    : undefined;
  return (
    <span
      className={cn(
        'mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]',
        goal.done && 'opacity-60'
      )}
    >
      {TYPE_ICON[goal.type]}
      {scenario && (
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600 inline-flex items-center gap-1">
          {scenario.title}
        </span>
      )}
      {due && <span className={DUE_TONE[due.tone]}>{due.text}</span>}
      {goal.remind && !goal.done && <Bell size={12} className="text-neutral-400" />}
    </span>
  );
}

export const LessonAndSpeakScreen: React.FC<LessonAndSpeakScreenProps> = ({
  initialMode,
  onBack,
  onCompleteLesson,
}) => {
  const { isSpeaking } = useSpeakingState();
  const { completedLessonsMap, addXP, recordSpeakPass, seeWord } = useProgress();

  // Mode: speak or flashcards (sentence translation deleted)
  const [mode, setMode] = useState<'speak' | 'flashcards'>(() =>
    initialMode === 'flashcards' ? 'flashcards' : 'speak'
  );

  // Goals state
  const [composerKind, setComposerKind] = useState<CreateKind | null>(null);
  const [goals, setGoals] = useState<Goal[]>(() => loadGoals());
  const [celebrationMsg, setCelebrationMsg] = useState<string | null>(null);
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seededFirstGoalRef = useRef(false);

  useEffect(() => {
    if (seededFirstGoalRef.current) return;
    seededFirstGoalRef.current = true;
    const current = loadGoals();
    if (current.length === 0) {
      const ob = getOnboarding();
      const label = ob?.goal ? ONBOARDING_GOAL_LABELS[ob.goal] : undefined;
      if (label) {
        const now = new Date();
        const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const firstGoal: Goal = {
          id: makeId(),
          type: 'goal',
          title: label,
          dueISO: todayISO,
          remind: false,
          done: false,
          createdAt: Date.now(),
        };
        const next = [firstGoal];
        setGoals(next);
        saveGoals(next);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
    };
  }, []);

  const commit = (next: Goal[]) => {
    setGoals(next);
    saveGoals(next);
  };

  const tasks: GoalTask[] = useMemo(
    () =>
      goals.map((g) => ({
        id: g.id,
        label: g.title,
        done: g.done,
        meta: <GoalMeta goal={g} />,
      })),
    [goals]
  );

  const handleTasksChange = (next: GoalTask[]) => {
    const prevOpen = goals.filter((g) => !g.done).length;
    let newlyDone = false;
    const updatedGoals = goals.map((g) => {
      const t = next.find((n) => n.id === g.id);
      if (t && t.done && !g.done) {
        newlyDone = true;
      }
      return t && t.done !== g.done
        ? { ...g, done: t.done!, doneAt: t.done ? Date.now() : undefined }
        : g;
    });
    commit(updatedGoals);
    if (newlyDone) {
      markActiveToday();
    }

    const nowOpen = updatedGoals.filter((g) => !g.done).length;
    if (nowOpen === 0 && prevOpen > 0 && updatedGoals.some((g) => g.done)) {
      playTactileTone('celebrate');
      setCelebrationMsg('Sari boss! Goal complete 🎉');
      if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
      celebrationTimerRef.current = setTimeout(() => {
        setCelebrationMsg(null);
      }, 2500);
    } else if (newlyDone) {
      playTactileTone('goal');
    } else {
      playTactileTone('tap');
    }
  };

  const openCount = useMemo(
    () => goals.filter((g) => !g.done).length,
    [goals]
  );

  // =========================================================================
  // 1. DEDUPLICATED UNLOCKED PHRASES POOL
  // =========================================================================
  const unlockedPhrases = useMemo<VoiceDeckPhrase[]>(() => {
    const seen = new Set<string>();
    const list: VoiceDeckPhrase[] = [];

    for (let uIdx = 0; uIdx < COURSE_UNITS.length; uIdx++) {
      const unit = COURSE_UNITS[uIdx];
      const isUnlocked = isLevelUnlocked(
        uIdx,
        0,
        COURSE_UNITS,
        completedLessonsMap
      ).unlocked;
      if (!isUnlocked) continue;

      for (const level of unit.levels) {
        for (const lesson of level.lessons) {
          for (const ex of lesson.exercises) {
            const key = ex.translit.toLowerCase().trim();
            if (!seen.has(key) && ex.translit) {
              seen.add(key);
              // Difficulty mapped from unit CEFR / phase:
              // Phase 1 (A1) -> Easy, Phases 2-4 (A1+/A2) -> Moderate, Phase 5 (B1) -> Hard
              const difficulty: 'Easy' | 'Moderate' | 'Hard' =
                unit.phase === 1
                  ? 'Easy'
                  : unit.phase === 5
                  ? 'Hard'
                  : 'Moderate';

              list.push({
                id: ex.id,
                kannada: ex.kannada || ex.translit,
                translit: ex.translit,
                meaning: ex.meaning,
                unitTitle: unit.title,
                unitEmoji: unit.emoji,
                unitId: unit.id,
                phase: unit.phase,
                difficulty,
              });
            }
          }
        }
      }
    }

    // Safe fallback to unit 1 if nothing unlocked yet
    if (list.length === 0 && COURSE_UNITS[0]) {
      const u = COURSE_UNITS[0];
      for (const level of u.levels) {
        for (const lesson of level.lessons) {
          for (const ex of lesson.exercises) {
            const key = ex.translit.toLowerCase().trim();
            if (!seen.has(key) && ex.translit) {
              seen.add(key);
              list.push({
                id: ex.id,
                kannada: ex.kannada || ex.translit,
                translit: ex.translit,
                meaning: ex.meaning,
                unitTitle: u.title,
                unitEmoji: u.emoji,
                unitId: u.id,
                phase: u.phase,
                difficulty: 'Easy',
              });
            }
          }
        }
      }
    }

    return list;
  }, [completedLessonsMap]);

  // =========================================================================
  // 2. PHRASE SPEAKING DECK STATE (DAILY LIFE SENTENCES FOR NON-KANNADA SPEAKERS)
  // =========================================================================
  const [speakCategory, setSpeakCategory] = useState<string>('all');
  const [deckRotation, setDeckRotation] = useState(0);
  const [speakIndex, setSpeakIndex] = useState(0);
  const [clearCount, setClearCount] = useState(0);
  const [speakSessionDone, setSpeakSessionDone] = useState(false);

  // Build the active pool of sentences for the Speak Deck
  const speakDeckPool = useMemo<VoiceDeckPhrase[]>(() => {
    const lessonSentences = unlockedPhrases.filter((p) =>
      p.translit.trim().includes(' ')
    );

    if (speakCategory === 'curriculum') {
      return lessonSentences.length > 0 ? lessonSentences : unlockedPhrases;
    }

    if (speakCategory === 'all') {
      const seen = new Set<string>(
        DAILY_LIFE_SPEAK_SENTENCES.map((s) => s.translit.toLowerCase().trim())
      );
      const combined = [...DAILY_LIFE_SPEAK_SENTENCES];
      for (const item of lessonSentences) {
        const key = item.translit.toLowerCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(item);
        }
      }
      return combined;
    }

    const filtered = DAILY_LIFE_SPEAK_SENTENCES.filter(
      (s) => s.unitId === speakCategory
    );
    return filtered.length > 0 ? filtered : DAILY_LIFE_SPEAK_SENTENCES;
  }, [speakCategory, unlockedPhrases]);

  // Up to 10 unique sentences for the current session rotation (sampled without replacement + cross-round memory)
  const voiceDeck = useMemo<VoiceDeckPhrase[]>(() => {
    return sampleRoundWithHistory(
      speakDeckPool,
      10,
      (p) => `speak:speak->kn:${normalizeForKey(p.translit || p.kannada)}`,
      {
        rng: mulberry32(Date.now() + deckRotation * 997),
      }
    );
  }, [speakDeckPool, deckRotation]);

  const currentVoiceCard: VoiceDeckPhrase =
    voiceDeck[speakIndex % Math.max(1, voiceDeck.length)] ||
    DAILY_LIFE_SPEAK_SENTENCES[0];

  // Voice recognition states
  const [speechSupportState, setSpeechSupportState] =
    useState<SpeechSupportState>(() => detectSpeechSupport());
  const [micState, setMicState] = useState<MicButtonState>('idle');
  const [speechErrorKind, setSpeechErrorKind] = useState<SpeechErrorKind>(null);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [speakStatus, setSpeakStatus] = useState<'idle' | 'pass' | 'fail'>(
    'idle'
  );
  const [speakMissCount, setSpeakMissCount] = useState(0);
  const [speakUnverified, setSpeakUnverified] = useState(false);
  const [heardTranscript, setHeardTranscript] = useState<string | null>(null);
  const [lastSimilarity, setLastSimilarity] = useState<number | null>(null);
  const [annaVoiceFeedback, setAnnaVoiceFeedback] = useState<string | null>(null);
  const [activeTtsItemId, setActiveTtsItemId] = useState<string | null>(null);
  const [audioToast, setAudioToast] = useState<string | null>(null);
  const audioToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRecRef = useRef<{ stop: () => void; abort?: () => void } | null>(
    null
  );

  const handlePlayCardScript = (itemId: string, scriptField?: string) => {
    playTactileTone('tap');
    const cleanScript = (scriptField || '').trim();
    if (!cleanScript || !/[\u0C80-\u0CFF]/.test(cleanScript)) {
      return;
    }

    setActiveTtsItemId(itemId);
    void speakScript(cleanScript, {
      itemId,
      onStart: () => {
        setActiveTtsItemId(itemId);
      },
      onEnd: () => {
        setActiveTtsItemId((cur) => (cur === itemId ? null : cur));
      },
      onUnsupported: () => {
        setActiveTtsItemId(null);
        setAudioToast('Audio not supported on this device');
        if (audioToastTimerRef.current) clearTimeout(audioToastTimerRef.current);
        audioToastTimerRef.current = setTimeout(() => {
          setAudioToast(null);
        }, 2500);
      },
    });
  };

  const speakFeedbackShownRef = useRef<boolean>(false);
  const streakMarkedPhrasesRef = useRef<Set<string>>(new Set());
  const [revealed, setRevealed] = useState<boolean>(false);

  const cleanupVoiceCardSpeechState = () => {
    speakFeedbackShownRef.current = false;
    activeRecRef.current?.abort?.();
    activeRecRef.current = null;
    abortActiveRecognition();
    cancelKannadaSpeech();
    setMicState('idle');
    setSpeechErrorKind(null);
    setInterimTranscript('');
    setSpeakStatus('idle');
    setSpeakMissCount(0);
    setSpeakUnverified(false);
    setHeardTranscript(null);
    setLastSimilarity(null);
    setAnnaVoiceFeedback(null);
  };

  useEffect(() => {
    return () => {
      if (audioToastTimerRef.current) {
        clearTimeout(audioToastTimerRef.current);
      }
      activeRecRef.current?.abort?.();
      abortActiveRecognition();
      cancelKannadaSpeech();
    };
  }, []);

  useEffect(() => {
    setRevealed(false);
    cleanupVoiceCardSpeechState();
    if (mode === 'speak' && currentVoiceCard) {
      seeWord(currentVoiceCard.id, {
        kannada: currentVoiceCard.kannada,
        translit: currentVoiceCard.translit,
        meaning: currentVoiceCard.meaning,
        example: `${currentVoiceCard.translit} — "${currentVoiceCard.meaning}"`,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVoiceCard.id, speakIndex, deckRotation, speakCategory, mode]);

  const evaluateVoiceCardAttempt = async (candidates: string[]) => {
    if (speakFeedbackShownRef.current || speakStatus !== 'idle') return;
    if (activeRecRef.current) {
      activeRecRef.current.stop();
      activeRecRef.current = null;
    }
    abortActiveRecognition();

    const rawTranscript = (candidates[0] || '').trim();
    const res = scoreSpeechAttempt(
      candidates,
      currentVoiceCard.translit,
      currentVoiceCard.kannada
    );
    const utterance = (res.bestTranscript || rawTranscript).trim();
    setHeardTranscript(utterance);
    setLastSimilarity(res.similarity);
    setInterimTranscript('');
    setSpeakUnverified(false);

    if (!utterance) {
      setMicState('idle');
      setSpeechErrorKind('no-speech');
      return;
    }

    // TIER 1 (instant, < 100ms, no network):
    // similarity >= 65% -> INSTANT PASS: show happy Anna + "Closeness: X%" badge immediately. NO brain call.
    if (res.similarity >= 0.65) {
      speakFeedbackShownRef.current = true;
      setMicState('result-pass');
      setSpeakStatus('pass');
      setClearCount((c) => c + 1);
      if (!streakMarkedPhrasesRef.current.has(currentVoiceCard.id)) {
        streakMarkedPhrasesRef.current.add(currentVoiceCard.id);
        markActiveToday();
      }
      recordSpeakPass();
      addXP(2);
      playTactileTone('success');
      speakKannada(currentVoiceCard.kannada, {
        fallbackTranslit: currentVoiceCard.translit,
      });
      return;
    }

    // TIER 2 (only when Tier 1 < 65%):
    // Show "Anna is checking..." and call scoreSpeakAttempt as final authority.
    setMicState('processing');

    try {
      const semantic = await scoreSpeakAttempt(
        currentVoiceCard.translit,
        utterance
      );

      if (speakFeedbackShownRef.current) return;

      if (semantic.unverified) {
        setMicState('idle');
        setSpeakUnverified(true);
        setAnnaVoiceFeedback(semantic.feedback || ANNA_UNVERIFIED_MESSAGE);
        return;
      }

      setAnnaVoiceFeedback(semantic.feedback || null);

      if (semantic.match) {
        speakFeedbackShownRef.current = true;
        setMicState('result-pass');
        setSpeakStatus('pass');
        setClearCount((c) => c + 1);
        if (!streakMarkedPhrasesRef.current.has(currentVoiceCard.id)) {
          streakMarkedPhrasesRef.current.add(currentVoiceCard.id);
          markActiveToday();
        }
        recordSpeakPass();
        addXP(2);
        playTactileTone('success');
        speakKannada(currentVoiceCard.kannada, {
          fallbackTranslit: currentVoiceCard.translit,
        });
      } else {
        setMicState('idle');
        playTactileTone('error');
        const nextMiss = speakMissCount + 1;
        setSpeakMissCount(nextMiss);
        if (nextMiss >= 2) {
          speakFeedbackShownRef.current = true;
          setSpeakStatus('fail');
        }
      }
    } catch {
      setMicState('idle');
      setSpeakUnverified(true);
      setAnnaVoiceFeedback(ANNA_UNVERIFIED_MESSAGE);
    }
  };

  const handleMicToggle = async () => {
    if (speakFeedbackShownRef.current || speakStatus !== 'idle') return;
    playTactileTone('tap');
    if (micState === 'listening') {
      activeRecRef.current?.stop();
      activeRecRef.current = null;
      setMicState('processing');
      return;
    }

    cleanupVoiceCardSpeechState();
    setMicState('requesting-permission');

    try {
      const rec = startKannadaSpeechRecognition({
        onInterimResult: (partial: string) => {
          setInterimTranscript(partial);
          setMicState('listening');
        },
        onResult: (transcripts: string[]) => {
          evaluateVoiceCardAttempt(transcripts);
        },
        onNoSpeech: () => {
          setSpeechErrorKind('no-speech');
          setMicState('idle');
        },
        onNetworkError: () => {
          setSpeechErrorKind('network');
          setMicState('idle');
        },
        onSupportStateChange: (state: SpeechSupportState) => {
          setSpeechSupportState(state);
        },
        onStateChange: (btnState: MicButtonState) => {
          setMicState(btnState);
        },
      });

      activeRecRef.current = rec;
    } catch {
      setSpeechErrorKind('no-speech');
      setMicState('idle');
    }
  };

  const handleNextVoiceCard = () => {
    playTactileTone('tap');
    cleanupVoiceCardSpeechState();
    if (speakIndex + 1 < voiceDeck.length) {
      setSpeakIndex((i) => i + 1);
    } else {
      setSpeakSessionDone(true);
    }
  };

  const handleRotateVoiceDeck = () => {
    playTactileTone('tap');
    cleanupVoiceCardSpeechState();
    setDeckRotation((r) => r + 1);
    setSpeakIndex(0);
    setClearCount(0);
    setSpeakSessionDone(false);
  };

  // =========================================================================
  // 3. FLASHCARDS OVERHAUL (PRE-COMPUTED TOPIC POOLS + 10-CARD SESSION)
  // =========================================================================
  const phrasesByTopic = useMemo(() => {
    const map: Record<string, VoiceDeckPhrase[]> = {};
    for (const t of FLASHCARD_TOPICS) {
      map[t.id] = [];
    }

    const allCurriculumPhrases: VoiceDeckPhrase[] = [];
    for (const unit of COURSE_UNITS) {
      const difficulty: 'Easy' | 'Moderate' | 'Hard' =
        unit.phase === 1 ? 'Easy' : unit.phase === 5 ? 'Hard' : 'Moderate';
      for (const level of unit.levels) {
        for (const lesson of level.lessons) {
          if (lesson.type === 'checkpoint') continue;
          for (const ex of lesson.exercises) {
            if (!ex.translit) continue;
            allCurriculumPhrases.push({
              id: ex.id,
              kannada: ex.kannada || ex.translit,
              translit: ex.translit,
              meaning: ex.meaning,
              unitTitle: unit.title,
              unitEmoji: unit.emoji,
              unitId: unit.id,
              phase: unit.phase,
              difficulty,
            });
          }
        }
      }
    }

    const combinedPool: VoiceDeckPhrase[] = [];
    const seenKeys = new Set<string>();
    for (const item of [
      ...CONTEXTUAL_FLASHCARD_PHRASES,
      ...DAILY_LIFE_SPEAK_SENTENCES,
      ...allCurriculumPhrases,
    ]) {
      const k = item.translit.toLowerCase().trim();
      if (k && !seenKeys.has(k)) {
        seenKeys.add(k);
        combinedPool.push(item);
      }
    }

    for (const phrase of combinedPool) {
      for (const t of FLASHCARD_TOPICS) {
        if (t.unitIds.includes(phrase.unitId)) {
          map[t.id].push(phrase);
          break;
        }
      }
    }

    return map;
  }, []);

  const [activeTopic, setActiveTopic] = useState<FlashcardTopicDef | null>(null);
  const [topicDeck, setTopicDeck] = useState<VoiceDeckPhrase[]>([]);
  const [fcIndex, setFcIndex] = useState(0);
  const [fcCelebration, setFcCelebration] = useState(false);

  const getTopicSeenCount = (topicId: string): number => {
    try {
      return parseInt(localStorage.getItem(`kanglish_seen_${topicId}`) || '0', 10);
    } catch {
      return 0;
    }
  };

  const handleStartTopic = (t: FlashcardTopicDef) => {
    playTactileTone('select');
    setActiveTopic(t);
    const pool = phrasesByTopic[t.id] || [];
    const sample = sampleRoundWithHistory(
      pool,
      10,
      (p) => `flashcard:${normalizeForKey(p.translit || p.kannada)}`,
      {
        rng: mulberry32(Date.now()),
      }
    );
    setTopicDeck(sample);
    setFcIndex(0);
    setFcCelebration(false);
  };

  const handleFinishFlashcardDeck = () => {
    playTactileTone('celebrate');
    addXP(10);
    if (activeTopic) {
      const key = `kanglish_seen_${activeTopic.id}`;
      const prev = getTopicSeenCount(activeTopic.id);
      try {
        localStorage.setItem(key, String(prev + topicDeck.length));
      } catch {
        // ignore
      }
    }
    setFcCelebration(true);
  };

  const activeFcCard: VoiceDeckPhrase | undefined = topicDeck[fcIndex];

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Top Header Row with Back Button & Mode Switcher */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="btn-ghost !py-2 !px-3.5 !text-xs inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* 2-Mode Switcher: Speak vs Flashcards */}
        <div className="glass-soft !rounded-2xl flex items-center gap-1 p-1">
          <button
            type="button"
            onClick={() => {
              playTactileTone('tap');
              setMode('speak');
            }}
            style={
              mode === 'speak'
                ? { backgroundColor: 'var(--accent)' }
                : undefined
            }
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
              mode === 'speak'
                ? 'text-white shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Speak Deck</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playTactileTone('tap');
              setMode('flashcards');
              setActiveTopic(null);
            }}
            style={
              mode === 'flashcards'
                ? { backgroundColor: 'var(--accent)' }
                : undefined
            }
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
              mode === 'flashcards'
                ? 'text-white shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Flashcards</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* STREAK CARD (ANIMATED SVG FLAME + 6-SLOT DAY STRIP)                 */}
      {/* =================================================================== */}
      <StreakCard />

      {/* =================================================================== */}
      {/* MY GOALS SECTION (ANIMATED TASK LIST)                               */}
      {/* =================================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            MY GOALS{openCount > 0 ? ` (${openCount})` : ''}
          </span>
          <CreateNewDisclosure
            onSelect={(kind) => {
              playTactileTone('select');
              setComposerKind(kind);
            }}
          />
        </div>

        {/* Celebration line */}
        <AnimatePresence>
          {celebrationMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm font-semibold flex items-center justify-between shadow-xs"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">🎉</span>
                <span>{celebrationMsg}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Composer Mount */}
        <AnimatePresence>
          {composerKind && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', bounce: 0.1, duration: 0.35 }}
              className="overflow-hidden"
            >
              <GoalComposer
                kind={composerKind}
                onCancel={() => {
                  playTactileTone('tap');
                  setComposerKind(null);
                }}
                onSave={(g) => {
                  playTactileTone('goal');
                  commit([...goals, g]);
                  setComposerKind(null);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state when goals.length === 0 */}
        {goals.length === 0 ? (
          <div className="glass-soft p-6 text-center space-y-1">
            <div className="w-10 h-10 rounded-full bg-neutral-200/80 text-neutral-600 mx-auto flex items-center justify-center mb-2">
              <Target size={20} />
            </div>
            <p className="text-sm font-semibold text-neutral-800">No goals yet</p>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              Tap &ldquo;Create New&rdquo; above to set a goal, jot a Kannada note, or schedule a daily reminder.
            </p>
          </div>
        ) : (
          <GoalTaskList
            tasks={tasks}
            accent={GOAL_ACCENT}
            onTasksChange={handleTasksChange}
            onDeleteTask={(id) => {
              playTactileTone('tap');
              commit(goals.filter((g) => g.id !== id));
            }}
          />
        )}
      </div>

      {/* =================================================================== */}
      {/* MODE A: PHRASE SPEAKING DECK                                        */}
      {/* =================================================================== */}
      {mode === 'speak' && (
        <div className="space-y-6">
          {speakSessionDone ? (
            /* Session Completed Screen */
            <div className="glass-strong relative overflow-hidden p-8 text-center space-y-6">
              <div className="w-24 h-24 rounded-3xl bg-[var(--surface-warm)] border border-[var(--line)] mx-auto flex items-center justify-center overflow-hidden shadow-md">
                <Mascot {...MASCOT_PLACEMENTS.completionNormalHero} size={80} />
              </div>
              <Mascot {...MASCOT_PLACEMENTS.completionSangoCorner} />
              <div className="space-y-1.5">
                <span className="mono-label text-[var(--success)]">
                  SPEAKING DECK COMPLETE
                </span>
                <h2 className="font-display font-bold text-2xl text-[var(--ink)]">
                  {clearCount} / {voiceDeck.length} Phrases Cleared!
                </h2>
                <p className="text-xs text-[var(--muted)] max-w-md mx-auto">
                  Anna is impressed! Regular out-loud repetition builds authentic
                  Bengaluru fluency.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleRotateVoiceDeck}
                  className="btn-primary !py-2.5 !px-5 !text-xs w-full sm:w-auto"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Practice 10 More Phrases</span>
                </button>
                <button
                  type="button"
                  onClick={onBack}
                  className="btn-ghost !py-2.5 !px-5 !text-xs w-full sm:w-auto"
                >
                  Back to Curriculum Path
                </button>
              </div>
            </div>
          ) : (
            /* Active Speaking Card — Speak Deck card -> Suno (smile) 48px badge */
            <div
              data-speak-deck-card="true"
              className="glass-strong relative overflow-hidden p-5 sm:p-8 text-center"
            >
              <ProfileCardBackdropDoodle variant="speak" />
              <div className="relative z-10 space-y-5">
                {/* Daily-life Situation Filter Row + Suno (smile) 48px Badge */}
                <div className="text-left space-y-3 pb-3 border-b border-[var(--line)]">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-white/85 border border-indigo-200/70 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                        <Mascot {...MASCOT_PLACEMENTS.practiceSpeakDeckBadge} />
                      </div>
                      <div className="min-w-0">
                        <span className="mono-label text-[var(--accent)] block">
                          DAILY LIFE SPEAK DECK · FOR NON-KANNADA SPEAKERS
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs font-semibold text-neutral-700">
                            Scratch the card, listen to the pronunciation, and speak aloud
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-[11px] font-mono-accent font-semibold text-primary">
                            {speakDeckPool.length} sentences
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Situation Category Pills — taller vertical touch targets + smooth touch scrolling */}
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-1 touch-pan-x overscroll-x-contain">
                    {DAILY_LIFE_SPEAK_CATEGORIES.map((cat) => {
                      const active = speakCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            playTactileTone('tap');
                            cleanupVoiceCardSpeechState();
                            setSpeakCategory(cat.id);
                            setDeckRotation(0);
                            setSpeakIndex(0);
                            setClearCount(0);
                            setSpeakSessionDone(false);
                          }}
                          className={`relative inline-flex min-h-[46px] sm:min-h-[48px] w-auto flex-none shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold border transition-all cursor-pointer touch-manipulation ${
                            active
                              ? 'border-indigo-700 text-white shadow-sm'
                              : 'bg-white/90 border-indigo-200/80 text-neutral-800 hover:border-primary hover:bg-white shadow-2xs'
                          }`}
                        >
                          {active && (
                            <motion.span
                              layoutId="speak-deck-cat-pill"
                              transition={{
                                type: 'spring',
                                stiffness: 380,
                                damping: 30,
                              }}
                              style={{ backgroundColor: 'var(--accent)' }}
                              className="absolute inset-0 rounded-2xl shadow-xs"
                            />
                          )}
                          <span aria-hidden className="relative z-10 text-base leading-none">
                            {cat.emoji}
                          </span>
                          <span className="relative z-10">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sentences Section Header & Segmented Progress Bar */}
                <div className="rounded-2xl bg-white/80 border border-indigo-200/70 p-3.5 sm:p-4 space-y-3 text-left shadow-2xs">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-1 rounded-xl bg-primary/10 border border-primary/20 font-mono-accent font-bold text-xs text-primary">
                        SENTENCE {speakIndex + 1} OF {voiceDeck.length}
                      </span>
                      <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-amber-50/90 border border-amber-200/80 text-neutral-800 inline-flex items-center gap-1.5">
                        <span aria-hidden>{currentVoiceCard.unitEmoji}</span>
                        <span>{currentVoiceCard.unitTitle}</span>
                      </span>
                      {/* DIFFICULTY CHIP */}
                      <span
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-mono-accent font-bold ${
                          currentVoiceCard.difficulty === 'Easy'
                            ? 'bg-[var(--success-soft)] text-[var(--success)] border border-[var(--success)]'
                            : currentVoiceCard.difficulty === 'Hard'
                            ? 'bg-[var(--error-soft)] text-[var(--error)] border border-[var(--error)]'
                            : 'bg-[var(--amber-soft)] text-[var(--amber)] border border-[var(--amber)]'
                        }`}
                      >
                        {currentVoiceCard.difficulty}
                      </span>
                    </div>

                    <DeckRotateButton onRotate={handleRotateVoiceDeck} />
                  </div>

                  {/* 10-segment visual progress bar for sentences */}
                  <div
                    className="grid gap-1.5"
                    style={{
                      gridTemplateColumns: `repeat(${Math.max(1, voiceDeck.length)}, minmax(0, 1fr))`,
                    }}
                    aria-hidden="true"
                  >
                    {voiceDeck.map((item, idx) => (
                      <div
                        key={item.id}
                        className={`h-1.5 rounded-full transition-colors ${
                          idx < speakIndex
                            ? 'bg-emerald-500'
                            : idx === speakIndex
                            ? 'bg-primary'
                            : 'bg-indigo-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* SCRATCH CARD SENTENCE DISPLAY */}
                <ScratchCard
                  key={currentVoiceCard.id}
                  seedKey={currentVoiceCard.id}
                  className="w-full min-h-[260px] shadow-sm"
                  ariaLabel="Scratch to reveal the phrase"
                  revealAnnouncement="Phrase revealed"
                  onReveal={() => setRevealed(true)}
                >
                  <div className="relative overflow-hidden p-5 sm:p-6 min-h-[260px] bg-gradient-to-br from-white/95 via-indigo-50/55 to-amber-50/45 flex flex-col justify-between gap-4 text-center">
                    {/* Top row inside card: Situation pill + Reveal status */}
                    <div className="relative z-10 flex items-center justify-between gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 border border-indigo-200/70 px-3 py-1 text-[11px] font-semibold text-neutral-700 shadow-2xs">
                        <span aria-hidden>{currentVoiceCard.unitEmoji}</span>
                        <span>{currentVoiceCard.unitTitle}</span>
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-mono-accent font-bold uppercase tracking-wider border ${
                          revealed
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-indigo-50 text-primary border-indigo-200'
                        }`}
                      >
                        {revealed ? '✨ Sentence Revealed' : '🔒 Scratch to Reveal'}
                      </span>
                    </div>

                    {/* Center block: Kanglish Sentence + English Meaning Box */}
                    <div className="relative z-10 my-auto space-y-3 py-1">
                      <div className="space-y-1">
                        <span className="mono-label !text-[10px] text-primary/80 block">
                          SAY THIS SENTENCE IN KANGLISH
                        </span>
                        <h1 className="pointer-events-none font-display font-extrabold text-xl sm:text-2xl md:text-[26px] text-neutral-900 leading-snug tracking-tight max-w-xl mx-auto">
                          &ldquo;{currentVoiceCard.translit}&rdquo;
                        </h1>
                      </div>

                      <div className="pointer-events-none inline-flex items-center gap-2 rounded-xl bg-white/90 border border-indigo-200/70 px-4 py-2 shadow-2xs max-w-lg mx-auto">
                        <span className="text-[10px] font-mono-accent font-bold uppercase tracking-wider text-neutral-400 shrink-0">
                          MEANING
                        </span>
                        <span className="h-3.5 w-[1px] bg-indigo-100 shrink-0" />
                        <p className="text-sm sm:text-base font-semibold text-neutral-700 text-left">
                          {currentVoiceCard.meaning}
                        </p>
                      </div>
                    </div>

                    {/* Bottom bar inside card: Unified Kannada Script + Audio Replay Button */}
                    <div className="relative z-10 w-full max-w-lg mx-auto rounded-2xl bg-white/95 border border-indigo-200/80 px-4 py-2.5 shadow-2xs flex items-center justify-between gap-3 text-left">
                      <div className="min-w-0">
                        <span className="block text-[9px] font-mono-accent font-bold uppercase tracking-wider text-neutral-400">
                          KANNADA SCRIPT
                        </span>
                        <p className="font-kannada text-base sm:text-lg font-bold text-neutral-900 leading-snug truncate">
                          {currentVoiceCard.kannada}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={!revealed}
                        onClick={() =>
                          handlePlayCardScript(
                            currentVoiceCard.id,
                            currentVoiceCard.kannada
                          )
                        }
                        className={`min-h-[42px] px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 shrink-0 touch-manipulation ${
                          !revealed ? 'pointer-events-none opacity-60' : ''
                        } ${
                          activeTtsItemId === currentVoiceCard.id
                            ? 'bg-[var(--accent)] text-white border-[var(--accent)] animate-pulse shadow-sm'
                            : 'bg-indigo-50/90 border-indigo-200 text-primary hover:bg-[var(--accent)] hover:text-white'
                        }`}
                        aria-label={`Listen to ${currentVoiceCard.translit}`}
                      >
                        <Volume2
                          className={`w-4 h-4 ${
                            activeTtsItemId === currentVoiceCard.id
                              ? 'fill-current'
                              : ''
                          }`}
                        />
                        <span>
                          {activeTtsItemId === currentVoiceCard.id
                            ? 'Playing...'
                            : 'Listen'}
                        </span>
                      </button>
                    </div>
                  </div>
                </ScratchCard>

                {/* 4. BIG SPEAK BUTTON (Mic icon) running scoreSpeakAttempt */}
                <div className="py-3 flex flex-col items-center justify-center space-y-3">
                  <button
                    type="button"
                    disabled={!revealed}
                    onClick={handleMicToggle}
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: 'var(--r-pill)',
                      backgroundColor:
                        speakStatus === 'pass'
                          ? 'var(--success)'
                          : 'var(--accent)',
                    }}
                    className={`flex items-center justify-center text-white transition-transform cursor-pointer hover:scale-105 active:scale-95 shadow-lg ${
                      !revealed ? 'pointer-events-none opacity-60' : ''
                    } ${
                      micState === 'listening' ? 'mic-ring-active' : ''
                    }`}
                    aria-label="Tap to speak in Kanglish"
                  >
                    {speakStatus === 'pass' ? (
                      <Check className="w-10 h-10 text-[#0A1022]" />
                    ) : (
                      <Mic className="w-10 h-10 text-white" />
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2">
                    <p className="mono-label text-[var(--muted)]">
                      {micState === 'requesting-permission'
                        ? 'REQUESTING MIC ACCESS...'
                        : micState === 'listening'
                        ? 'LISTENING... SPEAK NOW'
                        : micState === 'processing'
                        ? STRINGS.practice.annaChecking
                        : speakStatus === 'pass'
                        ? `✓ SARI! (${Math.round((lastSimilarity ?? 1) * 100)}% MATCH)`
                        : 'TAP MIC TO SPEAK'}
                    </p>
                    {!revealed && (
                      <span className="sr-only">Scratch the card first</span>
                    )}
                  </div>

                  {/* Live partial transcript */}
                  {interimTranscript && (
                    <p className="font-mono-accent text-xs text-[var(--muted)] px-3 py-1.5 rounded-xl bg-white/85 border border-[var(--line)]">
                      {interimTranscript}
                    </p>
                  )}

                  {/* Helper for no speech */}
                  {speechErrorKind === 'no-speech' && speakStatus === 'idle' && (
                    <p className="font-mono-accent text-xs text-[var(--muted)]">
                      Didn&apos;t catch that — tap the mic and try again guru!
                    </p>
                  )}
                </div>

                {/* FEEDBACK BANNERS */}
                {/* Unverified Anna fallback banner */}
                {speakUnverified && speakStatus === 'idle' && (
                  <div className="p-4 rounded-2xl bg-white/90 border border-[var(--amber)] flex items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--amber-soft)] border border-[var(--amber)] flex items-center justify-center shrink-0 overflow-hidden">
                        <Mascot {...MASCOT_PLACEMENTS.feedbackWrong} size={34} />
                      </div>
                      <div>
                        <p className="font-display font-semibold text-sm text-[var(--ink)]">
                          Anna: &ldquo;{annaVoiceFeedback || ANNA_UNVERIFIED_MESSAGE}&rdquo;
                        </p>
                        {heardTranscript && (
                          <p className="text-xs font-mono-accent text-[var(--muted)]">
                            Heard: &ldquo;{heardTranscript}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleMicToggle}
                      className="btn-ghost !py-2 !px-3 !text-xs shrink-0"
                    >
                      Try Again
                    </button>
                  </div>
                )}

                {/* Pass banner */}
                {speakStatus === 'pass' && (
                  <div className="p-4 rounded-2xl bg-[var(--success-soft)] border border-[var(--success)] flex items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--surface)] border border-[var(--success)] flex items-center justify-center shrink-0 overflow-hidden">
                        <Mascot {...MASCOT_PLACEMENTS.feedbackCorrect} size={34} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-display font-semibold text-sm text-[var(--success)]">
                            ✓ Sari! (Correct!)
                          </p>
                          {lastSimilarity !== null && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono-accent font-bold bg-[var(--surface)] text-[var(--success)] border border-[var(--success)]">
                              Closeness: {Math.round(lastSimilarity * 100)}%
                            </span>
                          )}
                        </div>
                        {annaVoiceFeedback && (
                          <p className="text-xs text-[var(--ink)] font-medium">
                            Anna: &ldquo;{annaVoiceFeedback}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleNextVoiceCard}
                      className="btn-primary !py-2 !px-5 !text-xs shrink-0"
                    >
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Fail banner */}
                {speakStatus === 'fail' && (
                  <div className="p-4 rounded-2xl bg-[var(--error-soft)] border border-[var(--error)] flex items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--surface)] border border-[var(--error)] flex items-center justify-center shrink-0 overflow-hidden">
                        <Mascot {...MASCOT_PLACEMENTS.feedbackWrong} size={34} />
                      </div>
                      <div>
                        <p className="font-display font-semibold text-sm text-[var(--error)]">
                          Correct: &ldquo;{currentVoiceCard.translit}&rdquo;
                        </p>
                        {annaVoiceFeedback && (
                          <p className="text-xs text-[var(--ink)]">
                            Anna: &ldquo;{annaVoiceFeedback}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleNextVoiceCard}
                      className="btn-primary !py-2 !px-5 !text-xs shrink-0"
                    >
                      <span>Next</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Bottom footer skip action */}
                <div className="pt-2 flex items-center justify-end border-t border-[var(--line)]">
                  <button
                    type="button"
                    onClick={handleNextVoiceCard}
                    className="btn-ghost !py-2 !px-4 !text-xs"
                  >
                    Skip Phrase →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* MODE B: 4. FLASHCARDS OVERHAUL (VERTICAL INTERACTIVE CAROUSEL)      */}
      {/* =================================================================== */}
      {mode === 'flashcards' && (
        <div className="space-y-6">
          {/* 1. TOPIC CARDS INTERACTIVE VERTICAL CAROUSEL (when no active topic) */}
          {!activeTopic && (
            <div className="space-y-4">
              <div className="glass-strong relative overflow-hidden p-5 text-left space-y-1">
                <FlashcardDecksHeaderBackdropDoodle />
                <span className="relative z-10 mono-label text-[var(--accent)] block">
                  FLASHCARD DECKS · UNLOCKED VOCABULARY
                </span>
                <h2 className="relative z-10 font-display font-bold text-xl sm:text-2xl text-[var(--ink)]">
                  Choose a Topic to Practice
                </h2>
                <p className="relative z-10 text-xs text-[var(--muted)] pr-16 sm:pr-24">
                  Swipe through the vertical cards — Kannada on top and English at the bottom.
                </p>
              </div>

              <FlashcardTopicCarousel
                topics={FLASHCARD_TOPICS.map((topic) => {
                  const pool = phrasesByTopic[topic.id] || [];
                  return {
                    id: topic.id,
                    title: topic.title,
                    icon: topic.icon,
                    description: topic.description,
                    cardCount: pool.length,
                    seenCount: getTopicSeenCount(topic.id),
                    isAvailable: pool.length > 0,
                  };
                })}
                onSelectTopic={(topicId) => {
                  const found = FLASHCARD_TOPICS.find((t) => t.id === topicId);
                  if (found) {
                    handleStartTopic(found);
                  }
                }}
              />
            </div>
          )}

          {/* 2. ACTIVE 10-CARD TOPIC SESSION (VERTICAL EFFECT-CARDS CAROUSEL) */}
          {activeTopic && (
            <div className="space-y-6">
              {fcCelebration ? (
                /* Celebration screen: celebrate Anna + "10 cards done! +10 XP" */
                <div className="glass-strong p-8 sm:p-10 text-center space-y-6">
                  <div className="w-28 h-28 rounded-3xl bg-[var(--surface-warm)] border-2 border-[var(--accent)] mx-auto flex items-center justify-center overflow-hidden shadow-lg">
                    <AnnaMascot variant="full" state="celebrate" size={88} />
                  </div>

                  <div className="space-y-2">
                    <span className="mono-label text-[var(--success)]">
                      TOPIC COMPLETE · {activeTopic.title.toUpperCase()}
                    </span>
                    <h2 className="font-display font-bold text-2xl sm:text-3xl text-[var(--ink)]">
                      10 cards done! +10 XP
                    </h2>
                    <p className="text-xs sm:text-sm text-[var(--muted)] max-w-md mx-auto">
                      Sakkath! You just strengthened your memory for {activeTopic.title}.
                      Keep practicing to stay sharp on Bengaluru streets.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTopic(null)}
                      className="btn-primary !py-2.5 !px-6 !text-xs w-full sm:w-auto"
                    >
                      <span>Practice Another Topic</span>
                    </button>
                    <button
                      type="button"
                      onClick={onBack}
                      className="btn-ghost !py-2.5 !px-5 !text-xs w-full sm:w-auto"
                    >
                      Back to Curriculum Path
                    </button>
                  </div>
                </div>
              ) : activeFcCard ? (
                <FlashcardStudyCarousel
                  topicId={activeTopic.id}
                  topicTitle={activeTopic.title}
                  cards={topicDeck}
                  currentIndex={fcIndex}
                  activeTtsItemId={activeTtsItemId}
                  onIndexChange={(nextIdx) => {
                    playTactileTone('tap');
                    setFcIndex(nextIdx);
                  }}
                  onPlayAudio={(id, script) => handlePlayCardScript(id, script)}
                  onBackToTopics={() => setActiveTopic(null)}
                  onFinishDeck={handleFinishFlashcardDeck}
                />
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Toast if speechSynthesis is unavailable */}
      {audioToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-toast-offset left-1/2 -translate-x-1/2 z-30 bg-on-surface text-on-primary rounded-full px-5 py-2.5 font-label-bold shadow-[0_4px_0_0_#5341cd] whitespace-nowrap"
        >
          {audioToast}
        </div>
      )}
    </div>
  );
};
