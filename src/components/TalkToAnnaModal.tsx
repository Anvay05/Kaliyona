import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Mic,
  Keyboard,
  Volume2,
  Send,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Heart,
  Bookmark,
  Check,
} from 'lucide-react';
import { useWallet } from '@/lib/wallet/store';
import { STRINGS } from '@/lib/i18n';
import {
  VOICE_CONFIG,
  isDailyMinutesCapReached,
  getRemainingDailyMinutes,
  setVoiceMockMode,
} from '../voice/voiceConfig';
import {
  startAnnaEarsPushToTalk,
  PushToTalkController,
} from '../voice/anna-ears';
import {
  chatWithAnna,
  AnnaChatTurn,
  AnnaMood,
  AnnaBrainReply,
} from '../voice/anna-brain';
import { speakAnnaReply, stopAnnaMouth } from '../voice/anna-mouth';
import { getKannadaScriptForText } from '../utils/speechUtils';
import { playTactileTone, playAnnaMascotPing } from '../data/kanglishData';
import { SCENARIOS, ScenarioCard } from '../data/scenarios';
import { replyTo } from '../lib/anna-persona-engine';
import { AnnaOrb, OrbState } from './AnnaOrb';
import {
  AnnaComposer,
  Persona,
  MentionValue,
  Mention,
  stripMentionTokens,
} from './AnnaComposer';
import { Mascot, MASCOT_PLACEMENTS } from './Mascot';
import { AnnaMessageMenu } from './AnnaMessageMenu';
import { VoiceNote, VoiceNoteGroup } from './ui/VoiceNote';
import { getKaliyonaPrefs } from '../lib/kaliyona-prefs';
import { markActiveToday } from '../lib/streak';
import {
  extractPhraseFromMessage,
  stripMoodTag,
  DEMO_KEY_LIMIT_MESSAGE,
  isQuotaOrAuthFailure,
} from '../lib/aiConfig';

export type AnnaAvatarState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface TalkToAnnaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToProfile?: () => void;
  phaseLabel?: string;
  initialAnnaMessage?: {
    kanglish: string;
    script: string;
    english: string;
  } | null;
  initialChips?: Array<{ kanglish: string; script?: string }> | null;
  initialScenario?: ScenarioCard | null;
}

const AnnaWave: React.FC<{ className?: string; size?: 'sm' | 'md' }> = ({
  className = '',
  size = 'sm',
}) => (
  <span
    className={`anna-wave ${
      size === 'md' ? 'anna-wave-md' : 'anna-wave-sm'
    } ${className}`}
    role="status"
    aria-label="Audio waveform active"
  >
    <span className="anna-wave-bar" style={{ animationDelay: '0.1s' }} />
    <span className="anna-wave-bar" style={{ animationDelay: '0.2s' }} />
    <span className="anna-wave-bar" style={{ animationDelay: '0.3s' }} />
    <span className="anna-wave-bar" style={{ animationDelay: '0.4s' }} />
    <span className="anna-wave-bar" style={{ animationDelay: '0.5s' }} />
  </span>
);

function renderUserBubbleContent(text: string): React.ReactNode {
  if (!text || !text.includes('@')) {
    return text;
  }
  const parts = text.split(/(@[A-Za-z0-9_\s-]+?(?=[.,!?]|\s|$))/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return (
        <span
          key={i}
          className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-white/25 text-white font-semibold text-xs border border-white/30 mx-0.5 shadow-2xs select-none"
        >
          {part}
        </span>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

const ANNA_INTRO_DATE_KEY = 'kanglish_anna_intro_date';

const INITIAL_ANNA_GREETING: AnnaChatTurn = {
  role: 'anna',
  kanglish: '"Namaskara! Naanu Anna" (ನಮಸ್ಕಾರ! ನಾನು ಅಣ್ಣ)',
  script: 'ನಮಸ್ಕಾರ! ನಾನು ಅಣ್ಣ',
  english:
    'Means "Hello! I am Anna" — I am your Kannada tutor in the Kaliyona app. Ask me how to say anything in Kannada!',
  text: '"Namaskara! Naanu Anna" (ನಮಸ್ಕಾರ! ನಾನು ಅಣ್ಣ)',
  correction: null,
  mood: 'happy',
  source: 'canned',
  offlineReason: 'daily intro',
};

const WELCOME_BACK_GREETINGS: AnnaChatTurn[] = [
  {
    role: 'anna',
    kanglish: '"Matte bandri!" (ಮತ್ತೆ ಬಂದ್ರಿ!)',
    script: 'ಮತ್ತೆ ಬಂದ್ರಿ!',
    english:
      'Means "Welcome back!" — I am Anna, your Kannada tutor in the Kaliyona app. What phrase would you like to learn today?',
    text: '"Matte bandri!" (ಮತ್ತೆ ಬಂದ್ರಿ!)',
    correction: null,
    mood: 'happy',
    source: 'canned',
    offlineReason: 'welcome back',
  },
  {
    role: 'anna',
    kanglish: '"Enu kaliyona ivattu?" (ಏನು ಕಲಿಯೋಣ ಇವತ್ತು?)',
    script: 'ಏನು ಕಲಿಯೋಣ ಇವತ್ತು?',
    english:
      'Means "What shall we learn today?" — \'enu\' = what, \'kaliyona\' = let\'s learn, \'ivattu\' = today.',
    text: '"Enu kaliyona ivattu?" (ಏನು ಕಲಿಯೋಣ ಇವತ್ತು?)',
    correction: null,
    mood: 'happy',
    source: 'canned',
    offlineReason: 'welcome back',
  },
  {
    role: 'anna',
    kanglish: '"Kannada abhyasa maadona" (ಕನ್ನಡ ಅಭ್ಯಾಸ ಮಾಡೋಣ)',
    script: 'ಕನ್ನಡ ಅಭ್ಯಾಸ ಮಾಡೋಣ',
    english:
      'Means "Let\'s practice Kannada" — \'abhyasa\' = practice, \'maadona\' = let\'s do.',
    text: '"Kannada abhyasa maadona" (ಕನ್ನಡ ಅಭ್ಯಾಸ ಮಾಡೋಣ)',
    correction: null,
    mood: 'happy',
    source: 'canned',
    offlineReason: 'welcome back',
  },
  {
    role: 'anna',
    kanglish: '"Banni banni!" (ಬನ್ನಿ ಬನ್ನಿ!)',
    script: 'ಬನ್ನಿ ಬನ್ನಿ!',
    english:
      'Means "Welcome, come in!" — \'banni\' = come (polite). Ready for your next Kannada lesson in Kaliyona!',
    text: '"Banni banni!" (ಬನ್ನಿ ಬನ್ನಿ!)',
    correction: null,
    mood: 'happy',
    source: 'canned',
    offlineReason: 'welcome back',
  },
];

function getSessionGreeting(): AnnaChatTurn {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const lastIntroDate = localStorage.getItem(ANNA_INTRO_DATE_KEY);
    if (lastIntroDate !== today) {
      localStorage.setItem(ANNA_INTRO_DATE_KEY, today);
      return INITIAL_ANNA_GREETING;
    }
  } catch {
    // fallback if localStorage is inaccessible
  }
  const idx = Math.floor(Math.random() * WELCOME_BACK_GREETINGS.length);
  return WELCOME_BACK_GREETINGS[idx];
}

const GOODBYE_TURN: AnnaChatTurn = {
  role: 'anna',
  kanglish: 'Sari guru, aamele sigona!',
  script: 'ಸರಿ ಗುರು, ಆಮೇಲೆ ಸಿಗೋಣ!',
  english: 'Alright friend, see you later!',
  text: 'Sari guru, aamele sigona!',
  correction: null,
  mood: 'happy',
  source: 'canned',
  offlineReason: 'session complete',
};

const QUICK_STARTER_PROMPTS = [
  'How do I order coffee and dosa?',
  'How do I ask the ticket conductor for a ticket?',
  'How much is the auto fare to Indiranagar?',
  'Teach me 3 daily Kannada words',
];

// Lip-sync cycle sequence: closed -> half -> open -> half -> closed
type AnnaMouthState = 'closed' | 'half' | 'open';
const LIP_SYNC_SEQUENCE: AnnaMouthState[] = ['closed', 'half', 'open', 'half'];

export const TalkToAnnaModal: React.FC<TalkToAnnaModalProps> = ({
  isOpen,
  onClose,
  onNavigateToProfile,
  phaseLabel,
  initialAnnaMessage = null,
  initialChips = null,
  initialScenario = null,
}) => {
  const handleGoToAiSettings = useCallback(() => {
    stopAnnaMouth();
    if (onNavigateToProfile) {
      onNavigateToProfile();
    } else {
      onClose();
      window.dispatchEvent(
        new CustomEvent('kaliyona_navigate_tab', { detail: 'profile' })
      );
    }
    setTimeout(() => {
      const el = document.getElementById('ai-settings-card');
      el?.scrollIntoView({ behavior: 'smooth' });
    }, 120);
  }, [onNavigateToProfile, onClose]);

  const [avatarState, setAvatarState] = useState<AnnaAvatarState>('idle');
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [orbPulseTick, setOrbPulseTick] = useState<number>(0);
  const [mouthState, setMouthState] = useState<AnnaMouthState>('closed');
  const [isHopping, setIsHopping] = useState<boolean>(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [currentMood, setCurrentMood] = useState<AnnaMood>('happy');
  const [messages, setMessages] = useState<AnnaChatTurn[]>([
    INITIAL_ANNA_GREETING,
  ]);
  const [turnsUsed, setTurnsUsed] = useState<number>(0);
  const [partialTranscript, setPartialTranscript] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordSecondsElapsed, setRecordSecondsElapsed] = useState<number>(0);
  const [textInputMode, setTextInputMode] = useState<boolean>(false);
  const [textDraft, setTextDraft] = useState<string>('');
  const [mockMode, setMockMode] = useState<boolean>(VOICE_CONFIG.MOCK_MODE);
  const [dailyCapReached, setDailyCapReached] = useState<boolean>(() =>
    isDailyMinutesCapReached()
  );
  const [remainingMinutes, setRemainingMinutes] = useState<number>(() =>
    getRemainingDailyMinutes()
  );
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);

  // Active persona and roleplay state
  const [activePersona, setActivePersona] = useState<ScenarioCard | null>(null);
  const [composerValue, setComposerValue] = useState<MentionValue>({
    text: '',
    mentions: [],
  });
  const [customChips, setCustomChips] = useState<
    Array<{ kanglish: string; script?: string }> | null
  >(null);

  // Anna message disclosure menu state
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<string>('');
  const [playingNoteIdx, setPlayingNoteIdx] = useState<number | null>(null);
  const copyTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const isTurnFavourited = useCallback((turn: AnnaChatTurn) => {
    if (turn.favourite !== undefined) return turn.favourite;
    try {
      const raw = localStorage.getItem('kaliyona_fav_phrases');
      if (!raw) return false;
      const list = JSON.parse(raw);
      const kanglish = turn.kanglish || turn.text;
      return list.some(
        (item: { kanglish?: string; script?: string }) =>
          item.kanglish === kanglish || (item.script && item.script === turn.script)
      );
    } catch {
      return false;
    }
  }, []);

  const handleMenuToggle = useCallback((idx: number) => {
    setOpenMenuIndex((curr) => (curr === idx ? null : idx));
  }, []);

  const handleCopyTurn = useCallback(
    async (turn: AnnaChatTurn, idx: number) => {
      const parts = [turn.script, turn.kanglish || turn.text, turn.english].filter(
        Boolean
      );
      const textToCopy = parts.join('\n');

      let copied = false;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(textToCopy);
          copied = true;
        }
      } catch {
        // fallback
      }

      if (!copied) {
        try {
          const textarea = document.createElement('textarea');
          textarea.value = textToCopy;
          textarea.style.position = 'fixed';
          textarea.style.left = '-9999px';
          document.body.appendChild(textarea);
          textarea.select();
          copied = document.execCommand('copy');
          document.body.removeChild(textarea);
        } catch {
          copied = false;
        }
      }

      if (copied) {
        if (copyTimeoutRef.current) {
          window.clearTimeout(copyTimeoutRef.current);
        }
        setCopiedIndex(idx);
        copyTimeoutRef.current = window.setTimeout(() => {
          setCopiedIndex(null);
        }, 1200);
      }
    },
    []
  );

  const wallet = useWallet();

  const handleToggleFavourite = useCallback(
    (turn: AnnaChatTurn, idx: number) => {
      const currentlyFav = isTurnFavourited(turn);
      const nextFav = !currentlyFav;
      setMessages((prev) =>
        prev.map((m, i) => (i === idx ? { ...m, favourite: nextFav } : m))
      );
      const fullMessage = stripMoodTag(turn.kanglish || turn.text || '').cleanText;
      const extracted = extractPhraseFromMessage(fullMessage);
      const phraseToSave = extracted.phrase || fullMessage;
      const scriptToSave =
        turn.script ||
        extracted.script ||
        getKannadaScriptForText(phraseToSave) ||
        phraseToSave;

      if (nextFav) {
        playTactileTone('success');
        wallet.saveItem({
          kn: scriptToSave,
          translit: phraseToSave,
          en: turn.english || fullMessage,
          source: 'roleplay',
        });
        setFallbackNotice(STRINGS.wallet.savedToast);
      }
      try {
        const key = 'kaliyona_fav_phrases';
        const raw = localStorage.getItem(key);
        const list: Array<{ script?: string; kanglish?: string; ts?: number }> = raw
          ? JSON.parse(raw)
          : [];
        const targetKanglish = turn.kanglish || turn.text;
        const targetScript = turn.script || '';
        const filtered = list.filter(
          (item) =>
            item.kanglish !== targetKanglish ||
            (Boolean(item.script) && item.script !== targetScript)
        );
        if (nextFav) {
          filtered.unshift({
            script: targetScript || scriptToSave,
            kanglish: targetKanglish,
            ts: Date.now(),
          });
        }
        localStorage.setItem(key, JSON.stringify(filtered));
      } catch {
        // fallback
      }
    },
    [isTurnFavourited, wallet]
  );

  const handleStartEdit = useCallback((turn: AnnaChatTurn, idx: number) => {
    setEditingIndex(idx);
    setEditingDraft(turn.kanglish || turn.text);
    setOpenMenuIndex(null);
  }, []);

  const handleCommitEdit = useCallback((idx: number) => {
    setEditingDraft((draft) => {
      const trimmed = draft.trim();
      if (trimmed) {
        setMessages((prev) =>
          prev.map((m, i) =>
            i === idx
              ? {
                  ...m,
                  kanglish: trimmed,
                  text: trimmed,
                  edited: true,
                }
              : m
          )
        );
      }
      return '';
    });
    setEditingIndex(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingIndex(null);
    setEditingDraft('');
  }, []);

  const handleDeleteTurn = useCallback(
    (idx: number) => {
      if (avatarState === 'speaking' || orbState === 'speaking') {
        stopAnnaMouth();
        setAvatarState('idle');
        setOrbState('idle');
        setMouthState('closed');
      }
      setMessages((prev) => prev.filter((_, i) => i !== idx));
      setOpenMenuIndex(null);
      setEditingIndex((curr) => (curr === idx ? null : curr));
    },
    [avatarState, orbState]
  );

  // Memoized personas for AnnaComposer
  const personas: Persona[] = useMemo(
    () => [
      {
        id: 'anna',
        name: 'Anna',
        role: 'Kannada Tutor · Kaliyona',
        color: '#6C5CE7',
      },
      ...SCENARIOS.map((s) => ({
        id: s.id,
        name: s.title,
        role: s.tagline,
        color: s.color,
      })),
    ],
    []
  );

  const pttControllerRef = useRef<PushToTalkController | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  const lipSyncTimeoutRef = useRef<number | null>(null);
  const hopTimeoutRef = useRef<number | null>(null);
  const lipStepRef = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const pointerDownTimeRef = useRef<number>(0);

  const maxTurns = VOICE_CONFIG.MAX_TURNS_PER_SESSION;
  const turnsLeft = Math.max(1, maxTurns - turnsUsed);
  const isSessionEnded = false;

  // Listen for prefers-reduced-motion changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  // Trigger a quick tactile ping when Anna starts speaking / animating
  const triggerHappyHop = useCallback(() => {
    playAnnaMascotPing();
  }, []);

  // Word boundary callback updates orb pulse tick for speaking reaction
  const handleSpeechBoundary = useCallback(() => {
    setOrbPulseTick((t) => t + 1);
  }, []);

  // Tapping the orb replays Anna's last spoken message (or default greeting)
  const handleOrbTap = useCallback(() => {
    if (avatarState === 'speaking' || orbState === 'speaking') return;

    const lastAnnaTurn = [...messages].reverse().find((m) => m.role === 'anna');
    const toSpeak = lastAnnaTurn || messages[0];
    if (!toSpeak) return;

    playTactileTone('tap');
    setOrbState('speaking');
    setAvatarState('speaking');

    void speakAnnaReply(
      {
        kanglish: toSpeak.kanglish || toSpeak.text,
        script: toSpeak.script,
        english: toSpeak.english,
      },
      {
        onStart: () => {
          setOrbState('speaking');
          setAvatarState('speaking');
          triggerHappyHop();
        },
        onBoundary: handleSpeechBoundary,
        onEnd: () => {
          setOrbState('idle');
          setAvatarState('idle');
          setMouthState('closed');
        },
      }
    );
  }, [avatarState, orbState, messages, triggerHappyHop, handleSpeechBoundary]);

  // C7) Lifecycle: reset on close / unmount, initialize if opened with Explore scenario preset
  useEffect(() => {
    if (!isOpen) {
      setActivePersona(null);
      setCustomChips(null);
      setComposerValue({ text: '', mentions: [] });
      return;
    }
    const matchingScenario =
      initialScenario ||
      SCENARIOS.find((s) => s.title === phaseLabel || s.id === phaseLabel);

    if (matchingScenario) {
      setActivePersona(matchingScenario);
      setCustomChips(matchingScenario.suggestedReplies);
    } else {
      setActivePersona(null);
      setCustomChips(initialChips || null);
    }
  }, [isOpen, initialScenario, phaseLabel, initialChips]);

  // C2) Switch persona when selected from popover or Explore preset
  const handleSelectScenarioPersona = useCallback(
    (scenario: ScenarioCard) => {
      setActivePersona(scenario);
      setCustomChips(scenario.suggestedReplies);

      const scenarioTurn: AnnaChatTurn = {
        role: 'anna',
        kanglish: scenario.annaOpener.kanglish,
        script: scenario.annaOpener.script,
        english: scenario.annaOpener.english,
        text: scenario.annaOpener.kanglish,
        correction: null,
        mood: 'happy',
        source: 'canned',
        offlineReason: `${scenario.title} scenario`,
      };

      setMessages((prev) => [...prev, scenarioTurn]);

      // Auto-speak opener with Anna TTS
      void speakAnnaReply(
        {
          kanglish: scenarioTurn.kanglish || scenarioTurn.text,
          script: scenarioTurn.script,
        },
        {
          onStart: () => {
            setOrbState('speaking');
            setAvatarState('speaking');
            triggerHappyHop();
          },
          onBoundary: handleSpeechBoundary,
          onEnd: () => {
            setOrbState('idle');
            setAvatarState('idle');
            setMouthState('closed');
          },
        }
      );
    },
    [handleSpeechBoundary, triggerHappyHop]
  );

  // C3) Revert to Anna with exit line
  const handleClearPersona = useCallback(() => {
    if (activePersona) {
      const exitTurn: AnnaChatTurn = {
        role: 'anna',
        kanglish: activePersona.exitLine.kanglish,
        script: activePersona.exitLine.script,
        english: 'See you again!',
        text: activePersona.exitLine.kanglish,
        correction: null,
        mood: 'happy',
        source: 'canned',
        offlineReason: 'banner exit',
      };
      setMessages((prev) => [...prev, exitTurn]);
      void speakAnnaReply(
        {
          kanglish: exitTurn.kanglish || exitTurn.text,
          script: exitTurn.script,
        },
        {
          onStart: () => {
            setOrbState('speaking');
            setAvatarState('speaking');
          },
          onBoundary: handleSpeechBoundary,
          onEnd: () => {
            setOrbState('idle');
            setAvatarState('idle');
            setMouthState('closed');
          },
        }
      );
    }
    setActivePersona(null);
    setCustomChips(null);
  }, [activePersona, handleSpeechBoundary]);

  // C1) Wrap composer onChange: simple state sync (persona switch happens on SEND)
  const handleComposerChange = useCallback((nextValue: MentionValue) => {
    setComposerValue(nextValue);
  }, []);

  // Lip-sync cycle loop synced to avatarState === 'speaking'
  useEffect(() => {
    if (lipSyncTimeoutRef.current) {
      window.clearInterval(lipSyncTimeoutRef.current);
      lipSyncTimeoutRef.current = null;
    }

    if (avatarState !== 'speaking') {
      // Immediately return to mouth-closed when listening, thinking, or idle
      setMouthState('closed');
      lipStepRef.current = 0;
      return;
    }

    if (prefersReducedMotion) {
      // Reduced motion: show static mouth-open while speaking
      setMouthState('open');
      return;
    }

    // Start speaking smoothly with half -> open -> half -> closed at a steady 155ms cadence
    lipStepRef.current = 1;
    setMouthState('half');
    lipSyncTimeoutRef.current = window.setInterval(() => {
      lipStepRef.current =
        (lipStepRef.current + 1) % LIP_SYNC_SEQUENCE.length;
      setMouthState(LIP_SYNC_SEQUENCE[lipStepRef.current]);
    }, 155);

    return () => {
      if (lipSyncTimeoutRef.current) {
        window.clearInterval(lipSyncTimeoutRef.current);
        lipSyncTimeoutRef.current = null;
      }
    };
  }, [avatarState, prefersReducedMotion]);

  useEffect(() => {
    if (!isOpen) {
      if (pttControllerRef.current) {
        pttControllerRef.current.cancel();
        pttControllerRef.current = null;
      }
      if (recordTimerRef.current) {
        window.clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
      if (lipSyncTimeoutRef.current) {
        window.clearTimeout(lipSyncTimeoutRef.current);
        lipSyncTimeoutRef.current = null;
      }
      if (hopTimeoutRef.current) {
        window.clearTimeout(hopTimeoutRef.current);
        hopTimeoutRef.current = null;
      }
      stopAnnaMouth();
      setIsRecording(false);
      setAvatarState('idle');
      setOrbState('idle');
      setMouthState('closed');
      setOpenMenuIndex(null);
      setEditingIndex(null);
      setEditingDraft('');
      setCopiedIndex(null);
      return;
    }

    setDailyCapReached(isDailyMinutesCapReached());
    setRemainingMinutes(getRemainingDailyMinutes());
    if (isDailyMinutesCapReached()) {
      setTextInputMode(true);
    }

    const sessionGreeting: AnnaChatTurn = initialAnnaMessage
      ? {
          role: 'anna',
          kanglish: initialAnnaMessage.kanglish,
          script: initialAnnaMessage.script,
          english: initialAnnaMessage.english,
          text: initialAnnaMessage.kanglish,
          correction: null,
          mood: 'happy',
          source: 'canned',
          offlineReason: 'scenario preset',
        }
      : getSessionGreeting();
    setMessages([sessionGreeting]);
    setTurnsUsed(0);
    setCurrentMood(sessionGreeting.mood || 'happy');

    // Speak initial greeting softly when modal opens if voice preference is enabled
    if (getKaliyonaPrefs().voice) {
      setOrbState('speaking');
      void speakAnnaReply(
        {
          kanglish: sessionGreeting.kanglish || sessionGreeting.text,
          script: sessionGreeting.script,
        },
        {
          onStart: () => {
            setOrbState('speaking');
            setAvatarState('speaking');
            triggerHappyHop();
          },
          onBoundary: handleSpeechBoundary,
          onEnd: () => {
            setOrbState('idle');
            setAvatarState('idle');
            setMouthState('closed');
          },
        }
      );
    } else {
      setOrbState('idle');
      setAvatarState('idle');
      setMouthState('closed');
    }

    return () => {
      if (pttControllerRef.current) {
        pttControllerRef.current.cancel();
        pttControllerRef.current = null;
      }
      if (recordTimerRef.current) {
        window.clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
      if (lipSyncTimeoutRef.current) {
        window.clearInterval(lipSyncTimeoutRef.current);
        lipSyncTimeoutRef.current = null;
      }
      if (hopTimeoutRef.current) {
        window.clearTimeout(hopTimeoutRef.current);
        hopTimeoutRef.current = null;
      }
      stopAnnaMouth();
      setOrbState('idle');
    };
  }, [isOpen, initialAnnaMessage, triggerHappyHop, handleSpeechBoundary]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partialTranscript, avatarState]);

  // Safety net: allow closing the modal via Escape key or Android/browser back button
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopAnnaMouth();
        onClose();
      }
    };

    const handlePopState = () => {
      stopAnnaMouth();
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleToggleMockMode = () => {
    const next = !mockMode;
    setVoiceMockMode(next);
    setMockMode(next);
    playTactileTone('tap');
  };

  const handleResetSession = () => {
    stopAnnaMouth();
    if (pttControllerRef.current) {
      pttControllerRef.current.cancel();
      pttControllerRef.current = null;
    }
    const freshGreeting: AnnaChatTurn = initialAnnaMessage
      ? {
          role: 'anna',
          kanglish: initialAnnaMessage.kanglish,
          script: initialAnnaMessage.script,
          english: initialAnnaMessage.english,
          text: initialAnnaMessage.kanglish,
          correction: null,
          mood: 'happy',
          source: 'canned',
          offlineReason: 'scenario preset',
        }
      : getSessionGreeting();
    setTurnsUsed(0);
    setMessages([freshGreeting]);
    setPartialTranscript('');
    setFallbackNotice(null);
    setOpenMenuIndex(null);
    setEditingIndex(null);
    setEditingDraft('');
    setCopiedIndex(null);
    setAvatarState('idle');
    setOrbState('speaking');
    setMouthState('closed');
    setCurrentMood(freshGreeting.mood || 'happy');
    void speakAnnaReply(
      {
        kanglish: freshGreeting.kanglish || freshGreeting.text,
        script: freshGreeting.script,
      },
      {
        onStart: () => {
          setOrbState('speaking');
          setAvatarState('speaking');
          triggerHappyHop();
        },
        onBoundary: handleSpeechBoundary,
        onEnd: () => {
          setOrbState('idle');
          setAvatarState('idle');
          setMouthState('closed');
        },
      }
    );
  };

  const submitLearnerUtterance = async (
    rawText: string,
    mentions?: Mention[],
    fullRawText?: string
  ) => {
    const rawToUse = (fullRawText || rawText || '').trim();
    if (!rawToUse) return;

    // If Anna was speaking a previous turn, stop audio cleanly so new English message goes through right away
    stopAnnaMouth();
    setPlayingNoteIdx(null);

    markActiveToday();
    const nextTurnsUsed = turnsUsed + 1;
    setTurnsUsed(nextTurnsUsed);
    setPartialTranscript('');

    // Detect mentions in the text if mentions array is empty
    let detectedMentions = mentions || [];
    if (detectedMentions.length === 0 && rawToUse.includes('@')) {
      const match = rawToUse.match(/@([A-Za-z0-9_\s-]+?)(?=[.,!?]|\s|$)/);
      if (match) {
        const query = match[1].toLowerCase().trim();
        const foundPersona =
          query === 'anna'
            ? { id: 'anna', title: 'Anna' }
            : SCENARIOS.find(
                (s) =>
                  s.title.toLowerCase() === query ||
                  s.id.toLowerCase() === query ||
                  s.title.toLowerCase().startsWith(query) ||
                  s.title.toLowerCase().includes(query)
              );
        if (foundPersona) {
          detectedMentions = [
            {
              id: foundPersona.id,
              name: foundPersona.title,
              startIndex: match.index || 0,
              endIndex: (match.index || 0) + match[0].length,
            },
          ];
        }
      }
    }

    const firstMention = detectedMentions[0];
    const isAddressingAnna = firstMention?.id === 'anna';
    const mentionedPersona =
      firstMention && !isAddressingAnna
        ? SCENARIOS.find((s) => s.id === firstMention.id)
        : null;

    // Stripped clean text for the reply engine
    const cleaned = stripMentionTokens(rawToUse, detectedMentions);

    // Record user message with @tokens intact in bubble text
    const userTurn: AnnaChatTurn = {
      role: 'user',
      text: rawToUse,
    };

    const updatedHistory = [...messages, userTurn];
    setMessages(updatedHistory);
    setAvatarState('thinking');
    setOrbState('thinking');
    setMouthState('closed');

    let newActivePersona = activePersona;
    let introTurn: AnnaChatTurn | null = null;

    if (isAddressingAnna) {
      if (activePersona) {
        // Exiting current persona
        introTurn = {
          role: 'anna',
          kanglish: activePersona.exitLine.kanglish,
          script: activePersona.exitLine.script,
          english: 'See you again!',
          text: activePersona.exitLine.kanglish,
          correction: null,
          mood: 'happy',
          source: 'canned',
          offlineReason: 'exit roleplay',
        };
      }
      newActivePersona = null;
      setActivePersona(null);
      setCustomChips(null);
    } else if (mentionedPersona && mentionedPersona.id !== activePersona?.id) {
      // Switching to a NEW persona!
      newActivePersona = mentionedPersona;
      setActivePersona(mentionedPersona);
      setCustomChips(mentionedPersona.suggestedReplies);

      // 1st Bubble: Persona Intro line
      const introLine =
        mentionedPersona.introLines[0] || {
          script: `ನಮಸ್ಕಾರ! ನಾನು ${mentionedPersona.title}.`,
          kanglish: `Namaskara! Naanu ${mentionedPersona.title}.`,
        };

      introTurn = {
        role: 'anna',
        kanglish: introLine.kanglish,
        script: introLine.script,
        english: `Namaste! I am ${mentionedPersona.title}.`,
        text: introLine.kanglish,
        correction: null,
        mood: 'happy',
        source: 'canned',
        offlineReason: `${mentionedPersona.title} intro`,
      };
    }

    // Call live AI brain (uses user key in localStorage -> else built-in default key -> else local fallback)
    const textForReply =
      cleaned ||
      (newActivePersona
        ? newActivePersona.annaOpener.kanglish
        : 'Namaskara Anna');

    let aiReply: AnnaBrainReply;
    try {
      aiReply = await chatWithAnna(
        textForReply,
        updatedHistory,
        newActivePersona
          ? {
              id: newActivePersona.id,
              title: newActivePersona.title,
              tagline: newActivePersona.tagline,
            }
          : null
      );
    } catch (err: unknown) {
      console.error('[anna-chat] API call failed:', err);
      const errMessage = err instanceof Error ? err.message : String(err || '');
      const isLimitOrAuth =
        errMessage === 'DEMO_KEY_LIMIT_REACHED' ||
        isQuotaOrAuthFailure(undefined, errMessage);

      const errorTurn: AnnaChatTurn = isLimitOrAuth
        ? {
            role: 'anna',
            kanglish: DEMO_KEY_LIMIT_MESSAGE,
            script:
              'ಡೆಮೊ ಕೀ ಮಿತಿ ತಲುಪಿದೆ — ಮುಂದುವರಿಸಲು ಸೆಟ್ಟಿಂಗ್ಸ್‌ನಲ್ಲಿ ನಿಮ್ಮ API ಕೀ ಸೇರಿಸಿ',
            english: DEMO_KEY_LIMIT_MESSAGE,
            text: DEMO_KEY_LIMIT_MESSAGE,
            correction: null,
            mood: 'neutral',
            source: 'canned',
            offlineReason: 'demo_key_limit',
          }
        : {
            role: 'anna',
            kanglish: 'Oops, network doing traffic jam — try again? 🛺',
            script: 'ನೆಟ್‌ವರ್ಕ್ ಟ್ರಾಫಿಕ್ ಜ್ಯಾಮ್ ಆಗಿದೆ — ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ! 🛺',
            english: 'Oops, network doing traffic jam — try again? 🛺',
            text: 'Oops, network doing traffic jam — try again? 🛺',
            correction: null,
            mood: 'neutral',
            source: 'canned',
            offlineReason: 'traffic jam',
          };
      setMessages([...updatedHistory, errorTurn]);
      setAvatarState('idle');
      setOrbState('idle');
      setMouthState('closed');
      return;
    }

    // If Gemini succeeded, use its intelligent reply; only fall back to local persona engine if offline/mock (never override demo_key_limit)
    const usePersonaFallback =
      aiReply.source === 'canned' &&
      aiReply.offlineReason !== 'demo_key_limit' &&
      Boolean(newActivePersona);
    const personaFallback = usePersonaFallback
      ? replyTo(newActivePersona, textForReply, updatedHistory)
      : null;

    const replyTurn: AnnaChatTurn = {
      role: 'anna',
      kanglish: personaFallback ? personaFallback.kanglish : aiReply.kanglish,
      script: personaFallback ? personaFallback.script : aiReply.script,
      english: personaFallback ? personaFallback.english : aiReply.english,
      text: personaFallback ? personaFallback.kanglish : aiReply.kanglish,
      correction: personaFallback ? null : aiReply.correction,
      mood: (personaFallback ? personaFallback.mood : aiReply.mood) || 'happy',
      explanation_lang: aiReply.explanation_lang || 'en',
      source: aiReply.source || 'gemini',
      offlineReason: aiReply.offlineReason,
    };

    setCurrentMood(replyTurn.mood || 'happy');

    const turnsToAdd = introTurn ? [introTurn, replyTurn] : [replyTurn];
    const nextMessages = [...updatedHistory, ...turnsToAdd];
    const latestReplyIdx = nextMessages.length - 1;

    setMessages(nextMessages);
    setDailyCapReached(isDailyMinutesCapReached());
    setRemainingMinutes(getRemainingDailyMinutes());

    // Speech: auto-speak the new persona's intro + reply, or just reply
    const textToSpeak: string = introTurn
      ? `${introTurn.kanglish || introTurn.text}. ${replyTurn.kanglish || replyTurn.text}`
      : (replyTurn.kanglish || replyTurn.text);
    const scriptToSpeak =
      introTurn && introTurn.script && replyTurn.script
        ? `${introTurn.script} ${replyTurn.script}`
        : replyTurn.script || textToSpeak;

    // Read voice preference at speak-time (not cached at mount) so toggling applies immediately
    const shouldAutoSpeak = getKaliyonaPrefs().voice;
    if (shouldAutoSpeak) {
      setOrbState('speaking');
      setAvatarState('speaking');
      setPlayingNoteIdx(latestReplyIdx);

      await speakAnnaReply(
        {
          kanglish: textToSpeak,
          script: scriptToSpeak,
          english: replyTurn.english,
        },
        {
          onStart: () => {
            setOrbState('speaking');
            setAvatarState('speaking');
            setPlayingNoteIdx(latestReplyIdx);
            triggerHappyHop();
          },
          onBoundary: handleSpeechBoundary,
          onEnd: () => {
            setOrbState('idle');
            setAvatarState('idle');
            setMouthState('closed');
            setPlayingNoteIdx((cur) => (cur === latestReplyIdx ? null : cur));
          },
        }
      );
    } else {
      setOrbState('idle');
      setAvatarState('idle');
      setMouthState('closed');
    }
  };

  const startRecording = async () => {
    if (isRecording || isSessionEnded || avatarState === 'thinking') return;

    if (isDailyMinutesCapReached()) {
      setDailyCapReached(true);
      setTextInputMode(true);
      return;
    }

    stopAnnaMouth();
    playTactileTone('tap');
    setFallbackNotice(null);
    setPartialTranscript('');
    setRecordSecondsElapsed(0);
    setIsRecording(true);
    setAvatarState('listening');
    setMouthState('closed');

    const controller = await startAnnaEarsPushToTalk({
      onPartial: (liveText) => {
        setPartialTranscript(liveText);
      },
      onAutoStop: async (finalText) => {
        if (recordTimerRef.current) {
          window.clearInterval(recordTimerRef.current);
          recordTimerRef.current = null;
        }
        pttControllerRef.current = null;
        setIsRecording(false);
        if (finalText && finalText.trim()) {
          await submitLearnerUtterance(finalText);
        } else {
          setAvatarState('idle');
          setMouthState('closed');
          setTextInputMode(true);
          setFallbackNotice(
            'No speech detected within 15s — switched to text input so you can keep chatting!'
          );
        }
      },
    });

    if (!controller) {
      setIsRecording(false);
      setAvatarState('idle');
      setMouthState('closed');
      setTextInputMode(true);
      setFallbackNotice(
        'Microphone unavailable in this browser/frame — switched to text input mode.'
      );
      return;
    }

    pttControllerRef.current = controller;
    recordTimerRef.current = window.setInterval(() => {
      setRecordSecondsElapsed((prev) =>
        Math.min(VOICE_CONFIG.MAX_RECORD_SECONDS, prev + 1)
      );
    }, 1000);
  };

  const stopRecordingAndSend = async () => {
    if (!isRecording || !pttControllerRef.current) return;

    if (recordTimerRef.current) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }

    const controller = pttControllerRef.current;
    pttControllerRef.current = null;
    setIsRecording(false);
    setAvatarState('thinking');
    setMouthState('closed');

    const finalTranscript = await controller.stop();
    if (finalTranscript && finalTranscript.trim()) {
      await submitLearnerUtterance(finalTranscript);
    } else {
      setAvatarState('idle');
      setMouthState('closed');
      setTextInputMode(true);
      setFallbackNotice(
        'Could not catch your voice — type your Kanglish message below or tap the mic to try again.'
      );
    }
  };

  const handlePointerDownPtt = () => {
    pointerDownTimeRef.current = Date.now();
    if (!isRecording) {
      startRecording();
    }
  };

  const handlePointerUpPtt = () => {
    const heldMs = Date.now() - pointerDownTimeRef.current;
    if (isRecording && heldMs > 350) {
      stopRecordingAndSend();
    }
  };

  const handleClickPtt = () => {
    const heldMs = Date.now() - pointerDownTimeRef.current;
    if (isRecording && heldMs <= 350 && pointerDownTimeRef.current > 0) {
      // Single tap starts; second tap stops via onPointerDown
    }
  };


  // Single message store drives both the character speech bubble (latest Anna message)
  // and the history list (all turns EXCEPT the one currently shown in the bubble).
  let lastAnnaIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'anna') {
      lastAnnaIndex = i;
      break;
    }
  }
  const bottomHintText =
    avatarState === 'listening' || isRecording
      ? STRINGS.anna.listeningHint
      : avatarState === 'thinking'
      ? STRINGS.anna.typingHint
      : avatarState === 'speaking'
      ? STRINGS.anna.speakingHint
      : STRINGS.anna.idleHint;

  const modalTree = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopAnnaMouth();
          onClose();
        }
      }}
      className="anna-modal-overlay fixed inset-0 left-0 right-0 w-full max-w-full z-[100] backdrop-blur-md flex items-center justify-center overflow-hidden box-border"
    >
      <div className="anna-modal-container glass-strong my-auto mx-auto w-full max-w-2xl !rounded-none sm:!rounded-[28px] flex flex-col overflow-hidden">
        {/* =============================================================== */}
        {/* TOP HEADER: Polished single row, non-wrapping title & red Close */}
        {/* =============================================================== */}
        <div className="sticky top-0 z-30 min-h-[60px] py-2 px-3.5 sm:px-5 bg-white/60 border-b border-indigo-100/80 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 border border-indigo-200/90 flex items-center justify-center shrink-0 shadow-xs">
              <img
                src="/assets/logo-icon.webp"
                alt=""
                width={26}
                height={26}
                className="w-6.5 h-6.5 object-contain"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <h2 className="text-[16px] sm:text-[18px] font-extrabold tracking-tight text-on-surface whitespace-nowrap leading-tight">
                {activePersona ? activePersona.title : 'Talk to Anna'}
              </h2>
              <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 whitespace-nowrap leading-none mt-1">
                <span>
                  {orbState === 'speaking'
                    ? 'Speaking Kannada…'
                    : orbState === 'thinking'
                    ? 'Typing…'
                    : 'Online'}
                </span>
                {orbState !== 'speaking' && orbState !== 'thinking' && (
                  <span className="hidden min-[400px]:inline text-on-surface-variant/80 font-medium">
                    · Kannada Tutor · Kaliyona
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Compact turn counter chip */}
            <div className="text-[11px] font-bold bg-surface-container-high border border-outline-variant/40 rounded-full px-2.5 py-1 text-on-surface-variant shrink-0">
              {turnsLeft}/{maxTurns}
            </div>

            {/* Red Close Button matching Send Button UI & animation */}
            <button
              type="button"
              onClick={() => {
                stopAnnaMouth();
                onClose();
              }}
              className="group/close relative flex h-9 sm:h-10 cursor-pointer items-center gap-0 overflow-hidden rounded-full bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 px-3.5 sm:px-4 text-white shadow-xs transition-all duration-200 hover:shadow-md hover:shadow-red-500/30 active:scale-95 shrink-0 touch-manipulation"
              aria-label="Close Talk to Anna"
              title="Close Talk to Anna"
            >
              <span className="svg-float-wrapper flex items-center">
                <X
                  size={16}
                  className="shrink-0 stroke-[2.5] transition-transform duration-300 ease-in-out group-hover/close:translate-x-[1.15em] group-hover/close:rotate-90 group-hover/close:scale-110"
                />
              </span>
              <span className="ml-1.5 block text-xs sm:text-sm font-semibold transition-transform duration-300 ease-in-out group-hover/close:translate-x-[5em]">
                Close
              </span>
            </button>
          </div>
        </div>

        {/* =============================================================== */}
        {/* DAILY MINUTES CAP BANNER (if hit)                               */}
        {/* =============================================================== */}
        {dailyCapReached && (
          <div className="px-4 py-2 bg-[var(--amber-soft)] border-b border-[var(--amber)]/50 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs text-[var(--amber)]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                You reached today&rsquo;s {VOICE_CONFIG.DAILY_MINUTES_CAP}-minute
                voice cap! Text-only mode is active so you can keep practicing.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setTextInputMode(true)}
              className="px-2.5 py-1 rounded-lg bg-[var(--surface)] border border-[var(--amber)] text-[10px] font-mono-accent text-[var(--amber)] shrink-0 cursor-pointer"
            >
              Text Mode Active
            </button>
          </div>
        )}

        {/* =============================================================== */}
        {/* ANNA TALKING ORB HERO STAGE (Refined interactive voice pill bar)*/}
        {/* =============================================================== */}
        <div className="px-3.5 sm:px-5 py-2 border-b border-indigo-100/80 bg-gradient-to-r from-indigo-50/50 via-purple-50/40 to-pink-50/30 flex flex-col items-center justify-center shrink-0">
          <div className="w-full flex items-center justify-between gap-3 select-none">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex items-center justify-center shrink-0">
                <div
                  className="pointer-events-none absolute inset-0 m-auto w-[68px] h-[68px] rounded-full opacity-60"
                  style={{
                    background:
                      'radial-gradient(circle at 50% 50%, #e4dfff 0%, rgba(228, 223, 255, 0.3) 60%, transparent 75%)',
                  }}
                  aria-hidden="true"
                />
                <AnnaOrb
                  size={52}
                  state={orbState}
                  color={activePersona?.color}
                  pulseTrigger={orbPulseTick}
                  onTap={handleOrbTap}
                />
              </div>

              <div className="flex flex-col items-start text-left min-w-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/12 text-primary text-[11px] font-bold tracking-wide">
                  <Volume2 className="w-3 h-3 shrink-0" />
                  <span className="truncate">
                    {orbState === 'thinking'
                      ? 'Anna is thinking…'
                      : orbState === 'speaking'
                      ? activePersona
                        ? `${activePersona.title} is speaking…`
                        : 'Anna is speaking…'
                      : orbState === 'success'
                      ? 'Sari Guru!'
                      : 'Tap Orb to Hear Anna'}
                  </span>
                </span>
                <span className="text-[11px] text-on-surface-variant truncate mt-0.5 pl-1">
                  Tap the orb anytime to replay voice pronunciation
                </span>
              </div>
            </div>

            {turnsUsed > 0 && (
              <button
                type="button"
                onClick={handleResetSession}
                className="px-2.5 py-1.5 rounded-full bg-surface-container-lowest/90 border border-outline-variant/70 text-[11px] font-semibold text-primary hover:bg-primary-fixed shrink-0 cursor-pointer inline-flex items-center gap-1 shadow-2xs transition-colors touch-manipulation"
                title="Reset conversation"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>

          {/* C5) PERSONA BANNER: when active, slim pill under the orb header */}
          <AnimatePresence>
            {activePersona && (
              <motion.div
                key={activePersona.id}
                initial={
                  prefersReducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, height: 0, marginTop: 0 }
                }
                animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                exit={
                  prefersReducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, height: 0, marginTop: 0 }
                }
                transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                className="overflow-hidden"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-lowest border border-outline-variant shadow-2xs max-w-[92vw] sm:max-w-md">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: activePersona.color }}
                  />
                  {activePersona.icon && (
                    <activePersona.icon className="w-3.5 h-3.5 text-on-surface-variant shrink-0" />
                  )}
                  <span className="font-semibold text-xs text-on-surface whitespace-nowrap">
                    {activePersona.title} mode
                  </span>
                  <span className="text-outline text-xs hidden min-[380px]:inline">·</span>
                  <span className="text-[11px] text-on-surface-variant truncate hidden min-[380px]:inline">
                    {activePersona.tagline}
                  </span>
                  <button
                    type="button"
                    onClick={handleClearPersona}
                    aria-label="Exit roleplay mode"
                    title="Exit roleplay mode"
                    className="w-5 h-5 rounded-full hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer shrink-0 ml-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* =============================================================== */}
        {/* MAIN SCROLLABLE CHAT LOG (WhatsApp/Telegram/Insta style)        */}
        {/* =============================================================== */}
        <VoiceNoteGroup className="anna-chat-wallpaper flex-1 overflow-y-auto px-3.5 sm:px-5 py-4 space-y-3.5 min-h-[180px]">
          {messages.map((turn, idx) => {
            const isAnna = turn.role === 'anna';
            const isLatestAnnaSpeaking =
              isAnna &&
              (playingNoteIdx === idx ||
                (idx === lastAnnaIndex && avatarState === 'speaking'));
            const spokenText = turn.kanglish || turn.text || '';
            const estimatedDuration = Math.max(
              2,
              Math.min(4, Math.ceil(spokenText.length / 18))
            );
            return (
              <div
                key={idx}
                className={`w-full flex ${
                  isAnna ? 'justify-start' : 'justify-end'
                }`}
              >
                <div
                  className={`flex items-end gap-2 ${
                    isAnna
                      ? 'max-w-[94%] sm:max-w-[84%]'
                      : 'max-w-[86%] sm:max-w-[76%]'
                  }`}
                >
                  {isAnna && (
                    <div className="w-8 h-8 rounded-full bg-white border border-indigo-200/80 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                      <img
                        src="/assets/logo-icon.webp"
                        alt=""
                        width={22}
                        height={22}
                        loading="lazy"
                        className="w-5.5 h-5.5 object-contain"
                      />
                    </div>
                  )}

                  <div
                    className={`relative overflow-visible transition-all ${
                      isAnna
                        ? 'w-fit min-w-[250px] sm:min-w-[300px] max-w-full rounded-2xl rounded-bl-xs bg-white/95 backdrop-blur-xs border border-indigo-200/80 text-on-surface px-4 py-3 shadow-[0_3px_12px_rgba(83,65,205,0.10)] space-y-2.5'
                        : 'w-fit max-w-full rounded-2xl rounded-br-xs bg-gradient-to-br from-[#6c5ce7] to-[#5341cd] text-white px-4 py-2.5 shadow-[0_3px_12px_rgba(108,92,231,0.28)]'
                    }`}
                  >
                    {isAnna && isTurnFavourited(turn) && (
                      <div
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center shadow-xs z-10"
                        title="Favourited phrase"
                        aria-label="Favourited phrase"
                      >
                        <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                      </div>
                    )}

                    {/* ANNA BUBBLE TOP ROW: compact action icons on right (only show script header if body doesn't already include it in brackets) */}
                    {isAnna && (
                      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-indigo-100/80">
                        <div className="min-w-0 flex-1">
                          {turn.script &&
                          !(turn.kanglish || turn.text || '').includes(
                            turn.script
                          ) ? (
                            <p className="text-xs sm:text-sm font-semibold text-primary leading-snug break-words text-left">
                              {turn.script}
                            </p>
                          ) : (
                            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                              {activePersona ? activePersona.title : 'Anna'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              playTactileTone('success');
                              wallet.saveItem({
                                kn: turn.script || turn.kanglish || turn.text,
                                translit: turn.kanglish || turn.text,
                                en: turn.english || '',
                                source: 'roleplay',
                              });
                              setFallbackNotice(STRINGS.wallet.savedToast);
                            }}
                            className={`w-7 h-7 rounded-full border shrink-0 cursor-pointer flex items-center justify-center transition-colors touch-manipulation ${
                              wallet.isSaved(
                                turn.script || turn.kanglish || turn.text
                              )
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600'
                                : 'bg-surface-container-lowest border-outline-variant/80 text-on-surface-variant hover:text-primary hover:border-primary'
                            }`}
                            title={
                              wallet.isSaved(
                                turn.script || turn.kanglish || turn.text
                              )
                                ? 'Saved in Notes ✓'
                                : 'Save to Notes 🔖'
                            }
                            aria-label={
                              wallet.isSaved(
                                turn.script || turn.kanglish || turn.text
                              )
                                ? 'Saved in Notes'
                                : 'Save to Notes'
                            }
                          >
                            {wallet.isSaved(
                              turn.script || turn.kanglish || turn.text
                            ) ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Bookmark className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <AnnaMessageMenu
                            turnIndex={idx}
                            isOpen={openMenuIndex === idx}
                            prefersReducedMotion={prefersReducedMotion}
                            isFavourited={isTurnFavourited(turn)}
                            isCopied={copiedIndex === idx}
                            onOpenToggle={() => handleMenuToggle(idx)}
                            onClose={() => setOpenMenuIndex(null)}
                            onEdit={() => handleStartEdit(turn, idx)}
                            onCopy={() => void handleCopyTurn(turn, idx)}
                            onToggleFavourite={() =>
                              handleToggleFavourite(turn, idx)
                            }
                            onDelete={() => handleDeleteTurn(idx)}
                          />
                        </div>
                      </div>
                    )}

                    {/* INTERACTIVE VOICE NOTE WAVEFORM PLAYER */}
                    {isAnna && (
                      <div className="pt-0.5">
                        <VoiceNote
                          size="sm"
                          bars={28}
                          seed={idx * 13 + spokenText.length}
                          duration={estimatedDuration}
                          accent={activePersona?.color || '#1D63FF'}
                          playing={isLatestAnnaSpeaking}
                          onPlayingChange={(nextPlaying) => {
                            if (nextPlaying) {
                              stopAnnaMouth();
                              setPlayingNoteIdx(idx);
                              setOrbState('speaking');
                              setAvatarState('speaking');
                              void speakAnnaReply(
                                {
                                  kanglish: turn.kanglish || turn.text,
                                  script: turn.script,
                                  english: turn.english,
                                },
                                {
                                  onStart: () => {
                                    setPlayingNoteIdx(idx);
                                    setOrbState('speaking');
                                    setAvatarState('speaking');
                                    triggerHappyHop();
                                  },
                                  onBoundary: handleSpeechBoundary,
                                  onEnd: () => {
                                    setPlayingNoteIdx((cur) =>
                                      cur === idx ? null : cur
                                    );
                                    setOrbState('idle');
                                    setAvatarState('idle');
                                    setMouthState('closed');
                                  },
                                }
                              );
                            } else {
                              stopAnnaMouth();
                              setPlayingNoteIdx((cur) =>
                                cur === idx ? null : cur
                              );
                              setOrbState('idle');
                              setAvatarState('idle');
                              setMouthState('closed');
                            }
                          }}
                        />
                      </div>
                    )}

                    {/* HORIZONTAL FULL-WIDTH MESSAGE BODY */}
                    <div className="w-full space-y-1.5 text-left">
                      {isAnna && editingIndex === idx ? (
                        <div className="space-y-1 w-full pt-0.5">
                          <textarea
                            autoFocus
                            ref={(el) => {
                              if (el) {
                                el.focus();
                                el.select();
                              }
                            }}
                            value={editingDraft}
                            onChange={(e) => setEditingDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleCommitEdit(idx);
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                handleCancelEdit();
                              }
                            }}
                            onBlur={() => handleCommitEdit(idx)}
                            rows={2}
                            className="w-full text-sm sm:text-[15px] font-bold text-on-surface bg-surface-container-lowest border border-primary/50 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none leading-snug"
                          />
                          <div className="text-[10px] text-on-surface-variant font-sans font-medium">
                            Press Enter to save · Esc to cancel
                          </div>
                        </div>
                      ) : isAnna ? (
                        (() => {
                          const rawKanglish = stripMoodTag(
                            turn.kanglish || turn.text || ''
                          ).cleanText;
                          const lines = rawKanglish
                            .split(/\r?\n/)
                            .map((l) => l.trim())
                            .filter(Boolean);
                          const mainRaw = lines[0] || rawKanglish;
                          const fallbackLine2 =
                            lines.length > 1 ? lines.slice(1).join(' ') : '';
                          const extraExp =
                            stripMoodTag(turn.english || '').cleanText ||
                            fallbackLine2;

                          const cleanMainPhrase = mainRaw.replace(
                            /^["'“”‘’]+|["'“”‘’]+$/g,
                            ''
                          );
                          const formattedKannadaLine =
                            turn.script && !mainRaw.includes(turn.script)
                              ? `"${cleanMainPhrase}" (${turn.script})`
                              : mainRaw;

                          const showEnglishExplanation =
                            Boolean(extraExp) &&
                            extraExp.toLowerCase() !==
                              mainRaw.toLowerCase() &&
                            extraExp.toLowerCase() !==
                              formattedKannadaLine.toLowerCase();

                          return (
                            <div className="w-full space-y-1.5 text-left pt-0.5">
                              <p className="w-full whitespace-pre-wrap break-words text-left text-[15px] sm:text-base font-bold text-on-surface leading-snug font-sans">
                                {formattedKannadaLine}
                                {turn.edited && (
                                  <span className="text-[10px] text-on-surface-variant/70 italic font-normal ml-1.5 inline-block">
                                    (edited)
                                  </span>
                                )}
                              </p>
                              {showEnglishExplanation && (
                                <p className="w-full whitespace-pre-wrap break-words text-left text-sm sm:text-[14.5px] font-normal text-on-surface-variant leading-relaxed font-sans border-t border-indigo-100/70 pt-1.5">
                                  {extraExp}
                                </p>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <p className="w-full whitespace-pre-wrap break-words text-left text-[15px] sm:text-base leading-relaxed font-sans font-medium text-white">
                          {renderUserBubbleContent(turn.text)}
                        </p>
                      )}

                      {isAnna &&
                        (turn.offlineReason === 'demo_key_limit' ||
                          (turn.kanglish &&
                            turn.kanglish.includes('Demo key limit reached'))) && (
                          <div className="pt-1.5">
                            <button
                              type="button"
                              onClick={handleGoToAiSettings}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold shadow-2xs hover:bg-primary/90 transition cursor-pointer"
                            >
                              Open Settings ⚙️
                            </button>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Starter prompt & roleplay suggestion chips inside scrollable chat log */}
          {((customChips && customChips.length > 0) || turnsUsed === 0) && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 pl-10">
              {(customChips && customChips.length > 0
                ? customChips.map((c) => c.kanglish)
                : initialChips && initialChips.length > 0
                ? initialChips.map((c) => c.kanglish)
                : QUICK_STARTER_PROMPTS
              ).map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => submitLearnerUtterance(chip)}
                  className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-xs hover:border-primary border border-indigo-200/80 text-xs font-medium text-on-surface shadow-2xs hover:text-primary transition-colors cursor-pointer touch-manipulation"
                >
                  &ldquo;{chip}&rdquo;
                </button>
              ))}
            </div>
          )}

          {avatarState === 'thinking' && (
            <div className="w-full flex justify-start">
              <div className="flex items-end gap-2 max-w-[88%]">
                <div className="w-8 h-8 rounded-full bg-white border border-indigo-200/80 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                  <img
                    src="/assets/logo-icon.webp"
                    alt=""
                    width={22}
                    height={22}
                    loading="lazy"
                    className="w-5.5 h-5.5 object-contain"
                  />
                </div>
                <div
                  className="rounded-2xl rounded-bl-xs px-4 py-3 bg-white/95 border border-indigo-200/80 shadow-xs flex items-center gap-1.5"
                  aria-label="Anna is thinking"
                >
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                  <span
                    className="w-2 h-2 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </div>
            </div>
          )}

          {fallbackNotice && (
            <div className="px-3.5 py-2 rounded-xl bg-white/90 border border-indigo-200/70 text-xs text-on-surface-variant text-center shadow-2xs">
              {fallbackNotice}
            </div>
          )}

          <div ref={messagesEndRef} />
        </VoiceNoteGroup>

        {/* =============================================================== */}
        {/* BOTTOM CONTROLS: AnnaComposer UI (Pinned cleanly at bottom)     */}
        {/* =============================================================== */}
        <div className="p-2.5 sm:p-3.5 border-t border-outline-variant/60 bg-surface-container-lowest shrink-0">
          <AnnaComposer
            value={composerValue}
            onChange={handleComposerChange}
            onSend={(cleanText, mentions, raw) =>
              submitLearnerUtterance(cleanText, mentions, raw)
            }
            personas={personas}
            placeholder="Write in English..."
            disabled={false}
            isSending={false}
          />
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalTree, document.body);
  }
  return modalTree;
};
