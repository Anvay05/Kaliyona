import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Volume2,
  Star,
  Compass,
} from 'lucide-react';
import {
  playTactileTone,
} from '../data/kanglishData';
import {
  COURSE_UNITS,
  getAllCoursePhrases,
  FlattenedCoursePhrase,
} from '../data/courseData';
import { SCENARIOS, SURVIVAL_SCENARIOS, ScenarioCard } from '../data/scenarios';
import { speakScript } from '../voice/anna-mouth';
import { Mascot, MASCOT_PLACEMENTS } from './Mascot';
import { ScenarioCarousel } from './ScenarioCarousel';
import { TalkToAnnaModal } from './TalkToAnnaModal';
import {
  ExploreHeaderBackdropDoodle,
  ExploreWordCardBackdropDoodle,
} from './UnitBackgroundDoodles';

interface ExploreAndPhrasebookScreenProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  savedPhraseIds: string[];
  onToggleSavePhrase: (id: string) => void;
  onStartSituationLesson: (
    situationId: string,
    mode?: 'lesson' | 'speak' | 'flashcards'
  ) => void;
  onGoToPath?: () => void;
}

const KANNADA_SCRIPT_REGEX = /[\u0C80-\u0CFF]/;

export const ExploreAndPhrasebookScreen: React.FC<
  ExploreAndPhrasebookScreenProps
> = ({
  searchQuery,
  onSearchChange,
  savedPhraseIds,
  onToggleSavePhrase,
  onStartSituationLesson,
  onGoToPath,
}) => {
  // Filter chip state: default to the first topic (no 'All' tab)
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>(
    () => COURSE_UNITS[0]?.id || 'u1'
  );
  const [speakingCardId, setSpeakingCardId] = useState<string | null>(null);
  const [audioToast, setAudioToast] = useState<string | null>(null);
  const [activeScenarioForChat, setActiveScenarioForChat] =
    useState<ScenarioCard | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scenario deep-link handoff from Home banner or other links
  useEffect(() => {
    try {
      const handoff = sessionStorage.getItem('kaliyona_active_scenario');
      if (handoff) {
        sessionStorage.removeItem('kaliyona_active_scenario');
        const found = SCENARIOS.find(
          (s) => s.id === handoff || s.id.includes(handoff)
        );
        if (found) {
          setActiveScenarioForChat(found);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showUnsupportedToast = () => {
    setAudioToast('Audio not supported on this device');
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setAudioToast(null);
    }, 2500);
  };

  // Flatten all phrases from courseData into one array {id, kannada, translit, meaning, unitId, ...}
  const allCoursePhrases: FlattenedCoursePhrase[] = useMemo(
    () => getAllCoursePhrases(),
    []
  );

  // Today's Daily Akshara word (deterministic by day of month)
  const dailyAkshara: FlattenedCoursePhrase = useMemo(() => {
    const dayIndex = new Date().getDate() % Math.max(1, allCoursePhrases.length);
    return (
      allCoursePhrases[dayIndex] ||
      allCoursePhrases[0] || {
        id: 'daily-namaskara',
        kannada: 'ನಮಸ್ಕಾರ',
        translit: 'namaskara',
        meaning: 'hello',
        unitId: 'u1',
        unitEmoji: '',
        unitTitle: 'Self Introduction',
        example: 'namaskara — "hello"',
      }
    );
  }, [allCoursePhrases]);

  /**
   * FIX 2a, 2c, 2d:
   * Speaks ONLY Kannada script via shared speakScript(kannadaScriptText).
   * If an item lacks a script field, console.warn with its id and do not speak.
   * Shows pulse/filled state while speaking; returns to normal on utterance end.
   */
  const handleSpeakScriptItem = (itemId: string, scriptField?: string) => {
    playTactileTone('tap');
    const cleanScript = (scriptField || '').trim();

    if (!cleanScript || !KANNADA_SCRIPT_REGEX.test(cleanScript)) {
      return;
    }

    setSpeakingCardId(itemId);
    void speakScript(cleanScript, {
      itemId,
      onStart: () => {
        setSpeakingCardId(itemId);
      },
      onEnd: () => {
        setSpeakingCardId((cur) => (cur === itemId ? null : cur));
      },
      onUnsupported: () => {
        setSpeakingCardId(null);
        showUnsupportedToast();
      },
    });
  };

  const handlePlayPhrase = (phrase: FlattenedCoursePhrase) => {
    handleSpeakScriptItem(phrase.id, phrase.kannada);
  };

  // Fast filter across current topic + search query
  const { savedMatches, unsavedMatches, allFiltered } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const savedSet = new Set(savedPhraseIds);

    const saved: FlattenedCoursePhrase[] = [];
    const unsaved: FlattenedCoursePhrase[] = [];

    for (let i = 0; i < allCoursePhrases.length; i++) {
      const p = allCoursePhrases[i];
      if (p.unitId !== selectedUnitFilter) {
        continue;
      }
      if (
        q &&
        !p.kannada.toLowerCase().includes(q) &&
        !p.translit.toLowerCase().includes(q) &&
        !p.meaning.toLowerCase().includes(q)
      ) {
        continue;
      }
      if (savedSet.has(p.id)) {
        saved.push(p);
      } else {
        unsaved.push(p);
      }
    }

    return {
      savedMatches: saved,
      unsavedMatches: unsaved,
      allFiltered: [...saved, ...unsaved],
    };
  }, [allCoursePhrases, selectedUnitFilter, searchQuery, savedPhraseIds]);

  const renderSingleWordCard = (
    phrase: FlattenedCoursePhrase,
    isSaved: boolean,
    cardIndex: number
  ) => {
    const isPlaying = speakingCardId === phrase.id;
    return (
      <div
        key={`${selectedUnitFilter}-${phrase.id}`}
        style={
          {
            '--stagger-delay': `${Math.min(cardIndex * 45, 180)}ms`,
          } as React.CSSProperties
        }
        onClick={() => handlePlayPhrase(phrase)}
        onContextMenu={(e) => {
          e.preventDefault();
          handlePlayPhrase(phrase);
        }}
        className={`anim-stagger-item relative overflow-hidden w-full p-4 sm:p-5 rounded-2xl border transition-all flex items-center justify-between gap-3 sm:gap-4 cursor-pointer select-none bg-[var(--surface)] hover:border-[var(--accent)] hover:shadow-md ${
          isSaved
            ? 'border-[var(--accent2)]/60'
            : 'border-[var(--line)]'
        } ${
          isPlaying
            ? 'ring-2 ring-[var(--accent)]'
            : ''
        }`}
      >
        <ExploreWordCardBackdropDoodle
          unitId={phrase.unitId}
          cardIndex={cardIndex}
          isPlaying={isPlaying}
        />

        {/* Left: Kanglish word, English meaning, and Kannada script badge */}
        <div className="relative z-10 min-w-0 flex-1 space-y-1.5 pr-16 sm:pr-28">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <p className="font-display font-bold text-base sm:text-xl text-[var(--ink)] leading-snug break-words">
              {phrase.translit}
            </p>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-lg border text-sm sm:text-base font-medium transition-all ${
                isPlaying
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                  : 'bg-white/90 border-[var(--line)] text-[var(--ink)] shadow-2xs'
              }`}
            >
              {phrase.kannada}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--muted)] font-medium leading-snug break-words">
            {phrase.meaning}
          </p>
        </div>

        {/* Right: Dedicated TTS & Bookmark icon buttons with generous spacing */}
        <div className="relative z-10 flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePlayPhrase(phrase);
            }}
            aria-label={`Play audio for ${phrase.translit}`}
            className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-all cursor-pointer shrink-0 ${
              isPlaying
                ? 'bg-[var(--accent)] text-white border-[var(--accent)] animate-pulse shadow-sm'
                : 'bg-white/90 border-[var(--line)] hover:bg-[var(--accent-soft)] text-[var(--accent)] shadow-2xs'
            }`}
          >
            <Volume2 className={`w-4 h-4 ${isPlaying ? 'fill-current' : ''}`} />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              playTactileTone('tap');
              onToggleSavePhrase(phrase.id);
            }}
            aria-label={isSaved ? 'Remove bookmark' : 'Bookmark phrase'}
            className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-colors cursor-pointer shrink-0 ${
              isSaved
                ? 'border-[var(--accent2)] text-[var(--accent2)] bg-[var(--accent2-soft)]'
                : 'bg-white/90 border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] shadow-2xs'
            }`}
          >
            <Star className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>
    );
  };

  const isDailySpeaking = speakingCardId === `daily-${dailyAkshara.id}`;

  return (
    <div className="space-y-5 w-full">
      {/* Search + Filter Chips Header Card (normal flow so it never overlaps vocabulary list) */}
      <div className="glass-strong relative overflow-hidden p-4 sm:p-5 space-y-4">
        <ExploreHeaderBackdropDoodle unitId={selectedUnitFilter || 'u1'} />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="mono-label text-[var(--accent)] block">
              KALIYONA EXPLORE · SINGLE-WORD CARDS
            </span>
            <h1
              className="font-display font-bold text-[var(--ink)] mt-1 leading-tight"
              style={{ fontSize: 'var(--text-h2)' }}
            >
              Explore &amp; Listen to Local Vocabulary
            </h1>
          </div>

          {/* Daily Akshara Button */}
          <button
            type="button"
            onClick={() =>
              handleSpeakScriptItem(
                `daily-${dailyAkshara.id}`,
                dailyAkshara.kannada
              )
            }
            className={
              isDailySpeaking
                ? 'self-start sm:self-auto px-4 py-3.5 rounded-xl border text-[15px] font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0 bg-[var(--accent)] text-white border-[var(--accent)] animate-pulse shadow-sm'
                : 'btn-fill-up self-start sm:self-auto shrink-0 max-w-full'
            }
            aria-label={`Daily Akshara: ${dailyAkshara.translit}`}
          >
            <Volume2 className={`w-4 h-4 shrink-0 ${isDailySpeaking ? '!text-white fill-current' : ''}`} />
            <span>Daily Akshara: {dailyAkshara.kannada} ({dailyAkshara.translit})</span>
          </button>
        </div>

        {/* Live Search Input */}
        <div className="relative z-10">
          <Search className="w-5 h-5 text-[var(--muted)] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search words, Kanglish translit, or English meaning..."
            className="w-full h-11 pl-12 pr-4 rounded-2xl bg-white/90 border border-[var(--line)] text-sm text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)] transition-colors shadow-2xs"
          />
        </div>

        {/* Topic Chips Row: single horizontally scrollable line */}
        <div
          style={{ WebkitOverflowScrolling: 'touch' }}
          className="relative z-10 flex flex-nowrap items-center gap-2.5 overflow-x-auto no-scrollbar py-1.5 touch-pan-x overscroll-x-contain"
        >
          {COURSE_UNITS.map((unit) => {
            const active = selectedUnitFilter === unit.id;
            return (
              <button
                key={unit.id}
                type="button"
                onClick={() => {
                  playTactileTone('tap');
                  setSelectedUnitFilter((cur) =>
                    cur === unit.id ? '' : unit.id
                  );
                }}
                style={
                  active
                    ? { backgroundColor: 'var(--accent)' }
                    : undefined
                }
                className={
                  active
                    ? 'min-h-[46px] w-auto flex-none shrink-0 whitespace-nowrap px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold border border-[var(--accent)] text-white shadow-[0_4px_12px_rgba(108,92,231,0.25)] inline-flex items-center gap-2 cursor-pointer transition-all touch-pan-x'
                    : 'min-h-[46px] bg-white/95 hover:bg-white border border-[var(--line)] hover:border-[var(--accent)] rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold text-[var(--ink)] w-auto flex-none shrink-0 whitespace-nowrap inline-flex items-center gap-2 cursor-pointer transition-all shadow-2xs touch-pan-x'
                }
              >
                <span>{unit.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SINGLE-WORD CARDS LIST */}
      <div className="space-y-6">
        {allFiltered.length === 0 ? (
          /* 6.2 Empty / no-selection state: Suno (wave) 120px with existing copy */
          <div className="glass-strong p-10 text-center space-y-4">
            <div className="w-[120px] h-[120px] mx-auto flex items-center justify-center">
              <Mascot {...MASCOT_PLACEMENTS.exploreEmptyState} />
            </div>
            <div className="space-y-1">
              <h3 className="font-display font-bold text-xl text-[var(--ink)]">
                No phrases yet — they unlock as you learn.
              </h3>
              <p className="text-xs text-[var(--muted)] max-w-md mx-auto">
                {searchQuery
                  ? `No phrases matched "${searchQuery}". Clear your search or head back to the curriculum path.`
                  : 'Complete lessons on your curriculum path to unlock more survival Kannada phrases.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {searchQuery && (
                <button
                  onClick={() => {
                    onSearchChange('');
                    setSelectedUnitFilter(COURSE_UNITS[0]?.id || 'u1');
                  }}
                  className="btn-fill-up"
                >
                  Clear Search Filter
                </button>
              )}
              <button
                onClick={() => {
                  if (onGoToPath) {
                    onGoToPath();
                  } else {
                    onStartSituationLesson('auto-ride', 'lesson');
                  }
                }}
                className="btn-primary !py-2.5 !px-5 !text-xs"
              >
                <Compass className="w-4 h-4" />
                <span>Go to Curriculum Path →</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* SAVED / BOOKMARKED PHRASES SURFACED AT TOP */}
            {savedMatches.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <span className="mono-label text-[var(--accent2)] flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    BOOKMARKED PHRASES ({savedMatches.length})
                  </span>
                  <span className="mono-label text-[var(--muted)] !text-[10px]">
                    SURFACED AT TOP
                  </span>
                </div>
                <div className="space-y-2.5">
                  {savedMatches.map((phrase, idx) =>
                    renderSingleWordCard(phrase, true, idx)
                  )}
                </div>
              </div>
            )}

            {/* ALL COURSE PHRASES UNDER CURRENT TOPIC */}
            <div className="space-y-2.5">
              {savedMatches.length > 0 && unsavedMatches.length > 0 && (
                <div className="flex items-center justify-between px-1 pt-2">
                  <span className="mono-label text-[var(--muted)]">
                    TOPIC VOCABULARY ({unsavedMatches.length})
                  </span>
                </div>
              )}
              <div className="space-y-2.5">
                {unsavedMatches.map((phrase, idx) =>
                  renderSingleWordCard(phrase, false, idx)
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Survival Scenarios Expandable Carousel */}
      <div className="space-y-4 pt-4 border-t border-[var(--line)]">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display font-semibold text-xl text-[var(--ink)]">
            Survival Scenarios 🛺
          </h2>
          <span className="mono-label text-[var(--muted)]">
            TAP ANY SCENARIO TO EXPAND
          </span>
        </div>

        <div className="w-full max-w-[540px] mx-auto">
          <ScenarioCarousel
            cards={SURVIVAL_SCENARIOS}
            autoPlay={false}
            onStartScenario={(card) => setActiveScenarioForChat(card)}
          />
        </div>
      </div>

      {/* Talk to Anna Modal pre-seeded when launched from a Scenario Card */}
      <TalkToAnnaModal
        isOpen={Boolean(activeScenarioForChat)}
        onClose={() => setActiveScenarioForChat(null)}
        phaseLabel={activeScenarioForChat?.title}
        initialAnnaMessage={activeScenarioForChat?.annaOpener ?? null}
        initialChips={activeScenarioForChat?.suggestedReplies ?? null}
        initialScenario={activeScenarioForChat}
      />

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
