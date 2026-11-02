import React, { useState, useEffect, useRef } from 'react';
import { Volume2, ArrowRight, X } from 'lucide-react';
import {
  Lesson as CurriculumLesson,
  Word,
  getLesson,
  getLessonWords,
} from '../data/curriculum';
import { speakKannada, useSpeakingState } from '../utils/speechUtils';
import { playTactileTone } from '../data/kanglishData';

const WORD_EMOJI_MAP: Record<string, string> = {
  // u1_l1
  w_u1_l1_1: '🙏',
  w_u1_l1_2: '💐',
  w_u1_l1_3: '🤲',
  w_u1_l1_4: '✅',
  w_u1_l1_5: '🙅',
  w_u1_l1_6: '🙋',
  // u1_l2
  w_u1_l2_1: '🪪',
  w_u1_l2_2: '🏙️',
  w_u1_l2_3: '🤝',
  w_u1_l2_4: '🏡',
  w_u1_l2_5: '💼',
  // u1_l3
  w_u1_l3_1: '1️⃣',
  w_u1_l3_2: '2️⃣',
  w_u1_l3_3: '3️⃣',
  w_u1_l3_4: '🌟',
  w_u1_l3_5: '✨',
  // u1_l4
  w_u1_l4_1: '🚪',
  w_u1_l4_2: '🚶',
  w_u1_l4_3: '🎁',
  w_u1_l4_4: '🫴',
  w_u1_l4_5: '🗣️',
  // u1_l5
  w_u1_l5_1: '👋',
  w_u1_l5_2: '😊',
  w_u1_l5_3: '👌',
  w_u1_l5_4: '🤔',
  w_u1_l5_5: '👍',
  // u2_l1
  w_u2_l1_1: '☕',
  w_u2_l1_2: '💧',
  w_u2_l1_3: '🥞',
  w_u2_l1_4: '🍛',
  w_u2_l1_5: '🥛',
  // u2_l2
  w_u2_l2_1: '🔥',
  w_u2_l2_2: '🍯',
  w_u2_l2_3: '🌶️',
  w_u2_l2_4: '📉',
  w_u2_l2_5: '🥬',
  // u3_l1
  w_u3_l1_1: '🛑',
  w_u3_l1_2: '↩️',
  w_u3_l1_3: '👀',
  w_u3_l1_4: '⏳',
  w_u3_l1_5: '🛺',
  // u4_l1
  w_u4_l1_1: '🌧️',
  w_u4_l1_2: '⏰',
  w_u4_l1_3: '🌅',
  w_u4_l1_4: '🌇',
  w_u4_l1_5: '📅',
  // u5_l1
  w_u5_l1_1: '📘',
  w_u5_l1_2: '❤️',
  w_u5_l1_3: '🤝',
  w_u5_l1_4: '☀️',
  w_u5_l1_5: '🙌',
};

export interface VocabCardFallbackProps {
  words: Word[];
  visualTheme?: string;
}

/**
 * B4. Pure CSS warm earthy gradient panel displaying 1 large relevant emoji
 * per word in the exact 16:9 aspect-ratio box when the WebP fails or is offline.
 */
export const VocabCardFallback: React.FC<VocabCardFallbackProps> = ({
  words,
  visualTheme,
}) => {
  return (
    <div
      role="img"
      aria-label={visualTheme || 'Lesson scene illustration'}
      data-testid="vocab-card-fallback"
      className="w-full aspect-[16/9] rounded-2xl overflow-hidden border border-[var(--line)] bg-gradient-to-br from-[#D96B43] via-[#E9A93B] to-[#3B7A57] flex items-center justify-center p-6 select-none"
    >
      <div className="flex items-center justify-center gap-6 sm:gap-10 px-6 py-4 rounded-2xl bg-[#FFFDF8]/20 backdrop-blur-sm border border-white/25">
        {words.map((word) => (
          <span
            key={word.id}
            className="text-5xl sm:text-6xl drop-shadow-md"
            aria-hidden="true"
          >
            {WORD_EMOJI_MAP[word.id] || '🌿'}
          </span>
        ))}
      </div>
    </div>
  );
};

export interface VocabPreviewProps {
  lessonId: string;
  attemptNumber?: number;
  onStartExercise: () => void;
  onExit?: () => void;
}

/**
 * B1–B5. Vocabulary Preview Card shown at `/exercise/:lessonId/preview`
 * before Question 1 of every exercise attempt (including retries).
 */
export const VocabPreview: React.FC<VocabPreviewProps> = ({
  lessonId,
  attemptNumber = 1,
  onStartExercise,
  onExit,
}) => {
  const { isSpeaking } = useSpeakingState();
  const [imageFailed, setImageFailed] = useState(false);
  const [activeSpokenWordId, setActiveSpokenWordId] = useState<string | null>(
    null
  );

  const lesson: CurriculumLesson = getLesson(lessonId);
  const currentWords: Word[] = getLessonWords(lesson.id);

  // B1.3: Pick the lesson's first 2–3 currentWords — never review words.
  // If the lesson has <= 2 words, show those 2; otherwise show the first 3.
  const previewCount = currentWords.length <= 2 ? currentWords.length : 3;
  const previewWords: Word[] = currentWords.slice(0, previewCount);

  const imageSrc = `/vocab-cards/${lesson.id}.webp`;

  const ctaBarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setImageFailed(false);
    setActiveSpokenWordId(null);
  }, [lesson.id, attemptNumber]);

  useEffect(() => {
    const el = ctaBarRef.current;
    if (!el || typeof window === 'undefined') return;

    const updateCtaBarHeight = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      if (h > 0) {
        document.documentElement.style.setProperty('--cta-bar-h', `${h}px`);
      }
    };

    updateCtaBarHeight();

    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(updateCtaBarHeight)
        : null;
    ro?.observe(el);
    window.addEventListener('resize', updateCtaBarHeight);

    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', updateCtaBarHeight);
    };
  }, []);

  const handleSpeakWord = (word: Word) => {
    playTactileTone('tap');
    setActiveSpokenWordId(word.id);
    speakKannada(word.kannada, {
      fallbackTranslit: word.transliteration,
    });
  };

  return (
    <div
      data-testid="vocab-preview-screen"
      data-lesson-id={lesson.id}
      data-attempt={attemptNumber}
      className="fixed inset-0 z-30 bg-[var(--bg)] text-[var(--ink)] flex flex-col overflow-hidden"
    >
      {/* Scrollable Content Viewport (strictly above the CTA bar) */}
      <div className="flex-1 min-h-0 w-full overflow-y-auto">
        <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 pt-5 space-y-5 cta-screen-scroll-content">
          {/* Top bar with lesson badge & optional close button */}
          <div className="flex items-center justify-between gap-3">
            {onExit ? (
              <button
                type="button"
                onClick={() => {
                  playTactileTone('tap');
                  onExit();
                }}
                className="w-10 h-10 rounded-xl bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer shrink-0"
                aria-label="Close vocabulary preview"
              >
                <X className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-10 h-10 shrink-0" />
            )}

            <div className="text-center">
              <span className="mono-label text-[var(--accent2)]">
                LEVEL {lesson.level} · LESSON {lesson.order} · {lesson.title}
              </span>
            </div>

            <div className="w-10 h-10 shrink-0 flex items-center justify-end">
              <span className="mono-label text-[var(--muted)] !text-[10px]">
                #{attemptNumber}
              </span>
            </div>
          </div>

          {/* 1. Title "This exercise uses these words" with Kannada subtitle "ಈ ಅಭ್ಯಾಸದ ಪದಗಳು" */}
          <header className="space-y-1 text-center sm:text-left">
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-[var(--ink)]">
              This exercise uses these words
            </h1>
            <p
              lang="kn"
              className="text-base sm:text-lg font-medium text-[var(--accent2)]"
            >
              ಈ ಅಭ್ಯಾಸದ ಪದಗಳು
            </p>
          </header>

          {/* 2. Hero illustration: full width, rounded corners, aspect-ratio 16:9, loading="lazy", decoding="async", explicit width/height */}
          <div className="w-full aspect-[16/9] rounded-2xl overflow-hidden bg-[var(--surface-warm)] border border-[var(--line)] shadow-sm">
            {imageFailed ? (
              <VocabCardFallback
                words={previewWords}
                visualTheme={lesson.visualTheme}
              />
            ) : (
              <img
                src={imageSrc}
                alt={lesson.visualTheme}
                width={1200}
                height={675}
                loading="lazy"
                decoding="async"
                onError={() => setImageFailed(true)}
                className="w-full h-full aspect-[16/9] object-cover rounded-2xl block"
              />
            )}
          </div>

          {/* 3. 2–3 word rows as real DOM text (Kannada large top, transliteration small muted, English medium accent, tappable TTS) */}
          <div
            data-testid="vocab-preview-words"
            className="space-y-3"
            role="list"
            aria-label="Lesson vocabulary words"
          >
            {previewWords.map((word) => {
              const isCurrentlySpoken =
                isSpeaking && activeSpokenWordId === word.id;
              return (
                <button
                  key={word.id}
                  type="button"
                  role="listitem"
                  data-word-id={word.id}
                  onClick={() => handleSpeakWord(word)}
                  className="w-full p-4 sm:p-5 rounded-2xl bg-[var(--surface)] hover:bg-[var(--surface-warm)] border border-[var(--line)] hover:border-[var(--accent)] transition-all flex items-center justify-between gap-4 text-left cursor-pointer group"
                >
                  <div className="space-y-1 min-w-0">
                    {/* Kannada word — large, on top */}
                    <p
                      lang="kn"
                      className="text-2xl sm:text-3xl font-bold text-[var(--ink)] leading-snug select-text"
                    >
                      {word.kannada}
                    </p>

                    {/* Transliteration — small, muted */}
                    <p className="text-xs sm:text-sm font-mono-accent text-[var(--muted)] select-text">
                      {word.transliteration}
                    </p>

                    {/* English meaning — medium, accent color */}
                    <p className="text-base sm:text-lg font-semibold text-[var(--accent2)] pt-0.5 select-text">
                      {word.english}
                    </p>
                  </div>

                  {/* Pronunciation speaker indicator */}
                  <span
                    className={`w-12 h-12 rounded-2xl bg-[var(--accent)] text-white flex items-center justify-center shrink-0 shadow-sm group-hover:brightness-110 transition-transform group-active:scale-95 ${
                      isCurrentlySpoken ? 'tts-speaking-ring' : ''
                    }`}
                    aria-hidden="true"
                  >
                    <Volume2 className="w-5 h-5" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Docked bottom CTA "Start Exercise" that advances to Question 1 */}
      <div
        ref={ctaBarRef}
        className="sticky-cta-bar w-full px-4 sm:px-6 pt-2.5 border-t border-[var(--line)]/50"
      >
        <div className="max-w-2xl mx-auto">
          <button
            type="button"
            data-testid="start-exercise-btn"
            onClick={() => {
              playTactileTone('tap');
              onStartExercise();
            }}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-base font-semibold cursor-pointer"
          >
            <span>Start Exercise</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VocabPreview;
