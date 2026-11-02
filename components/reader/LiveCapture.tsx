'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Camera,
  Upload,
  RotateCcw,
  AlertCircle,
  Sparkles,
  WifiOff,
  MessageCircle,
  Search,
  Copy,
  Check,
  Volume2,
  FileText,
  Bookmark,
} from 'lucide-react';
import {
  hasGeminiApiKey,
  isDailyScanCapReached,
  compressImageForGemini,
  scanKannadaImageWithGemini,
  GeminiReaderError,
} from '@/lib/reader/gemini';
import type { LexiconEntry } from '@/lib/reader/lexicon';
import {
  WordTranslationPopover,
  type SelectedWordItem,
} from './WordTranslationPopover';
import { playTactileTone } from '@/src/data/kanglishData';
import { speakKannada } from '@/lib/reader/tts';
import { useWallet } from '@/lib/wallet/store';
import { STRINGS } from '@/lib/i18n';

export interface LiveCaptureProps {
  onOpenRoleplayWithWord?: (word: {
    kn: string;
    translit: string;
    en: string;
  }) => void;
  onSwitchToGuided?: () => void;
  onOpenRoleplay?: () => void;
}

interface PositionedOcrChip {
  id: string;
  rawText: string;
  cleanText: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  entry: LexiconEntry | null;
}

function dedupeOverlappingChips(
  items: PositionedOcrChip[]
): PositionedOcrChip[] {
  const kept: PositionedOcrChip[] = [];
  for (const candidate of items) {
    const cArea = Math.max(0.01, candidate.wPct * candidate.hPct);
    let duplicate = false;
    for (const existing of kept) {
      const eArea = Math.max(0.01, existing.wPct * existing.hPct);
      const interW = Math.max(
        0,
        Math.min(candidate.xPct + candidate.wPct, existing.xPct + existing.wPct) -
          Math.max(candidate.xPct, existing.xPct)
      );
      const interH = Math.max(
        0,
        Math.min(candidate.yPct + candidate.hPct, existing.yPct + existing.hPct) -
          Math.max(candidate.yPct, existing.yPct)
      );
      const interArea = interW * interH;
      if (interArea / Math.min(cArea, eArea) > 0.6) {
        duplicate = true;
        break;
      }
    }
    if (!duplicate) {
      kept.push(candidate);
    }
  }
  return kept;
}

export const LiveCapture: React.FC<LiveCaptureProps> = ({
  onOpenRoleplayWithWord,
  onSwitchToGuided,
  onOpenRoleplay,
}) => {
  const reduce = useReducedMotion() ?? false;
  const wallet = useWallet();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const measureCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const mountedRef = useRef(true);
  const activeAbortRef = useRef<AbortController | null>(null);
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScanningRef = useRef(false);

  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine !== false : true
  );
  const [dailyCapHit, setDailyCapHit] = useState<boolean>(() =>
    isDailyScanCapReached()
  );
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [lastSource, setLastSource] = useState<File | string | null>(null);

  const [scanState, setScanState] = useState<
    'idle' | 'scanning' | 'done' | 'empty' | 'error'
  >('idle');
  const [loadingPhase, setLoadingPhase] = useState<'phase1' | 'phase2'>(
    'phase1'
  );
  const [phase1Pct, setPhase1Pct] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>(
    STRINGS.reader.genericError
  );

  const [chips, setChips] = useState<PositionedOcrChip[]>([]);
  const [overlayMode, setOverlayMode] = useState<'translate' | 'original'>(
    'translate'
  );
  const [fontSizes, setFontSizes] = useState<Record<string, number>>({});
  const [selectedWord, setSelectedWord] = useState<SelectedWordItem | null>(
    null
  );
  const [activeHoverId, setActiveHoverId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [saveToastMsg, setSaveToastMsg] = useState<string | null>(null);

  const handleSaveCardItem = (entry: LexiconEntry) => {
    playTactileTone('success');
    wallet.saveItem({
      kn: entry.kn,
      translit: entry.translit || entry.kn,
      en: entry.en,
      source: 'reader',
    });
    setSaveToastMsg(STRINGS.wallet.savedToast);
    if (saveToastTimerRef.current) clearTimeout(saveToastTimerRef.current);
    saveToastTimerRef.current = setTimeout(() => {
      setSaveToastMsg(null);
    }, 2400);
  };

  const handleCopyText = async (text: string, id: string) => {
    playTactileTone('tap');
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch {
      // ignore
    }
  };

  const handleCopyAll = async () => {
    playTactileTone('tap');
    const fullText = chips
      .map((c, i) => {
        if (!c.entry) return `${i + 1}. ${c.cleanText}`;
        return `${i + 1}. ${c.entry.kn} (${c.entry.translit}) -> ${c.entry.en}`;
      })
      .join('\n');
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullText);
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2200);
      }
    } catch {
      // ignore
    }
  };

  const handleSpeakItem = (
    kn: string,
    translit: string | undefined,
    id: string
  ) => {
    playTactileTone('tap');
    setSpeakingId(id);
    speakKannada(kn, {
      fallbackTranslit: translit,
      onStart: () => setSpeakingId(id),
      onEnd: () => setSpeakingId(null),
    });
  };

  useEffect(() => {
    mountedRef.current = true;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (activeAbortRef.current) {
        activeAbortRef.current.abort();
      }
      if (phaseTimerRef.current) {
        clearTimeout(phaseTimerRef.current);
      }
      if (saveToastTimerRef.current) {
        clearTimeout(saveToastTimerRef.current);
      }
    };
  }, []);

  // Revoke object URL on unmount or replace
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Strict Google-Lens style auto-fit font calculation:
  // - fontSize starts at boxHeightPx * 0.6
  // - measure via canvas measureText; shrink 0.5px steps until textWidth <= boxWidthPx - 4 OR floor of 8px reached
  // - clamp max at boxHeightPx * 0.72
  const recomputeFontSizes = useCallback(() => {
    const container = imageContainerRef.current;
    if (!container || chips.length === 0) return;

    const rect = container.getBoundingClientRect();
    const containerW = rect.width || container.offsetWidth;
    const containerH = rect.height || container.offsetHeight;
    if (containerW <= 0 || containerH <= 0) return;

    if (!measureCtxRef.current && typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      measureCtxRef.current = canvas.getContext('2d');
    }
    const ctx = measureCtxRef.current;
    const nextSizes: Record<string, number> = {};

    for (const chip of chips) {
      if (!chip.entry) continue;
      const label = chip.entry.en;
      const boxWidthPx = (chip.wPct / 100) * containerW;
      const boxHeightPx = (chip.hPct / 100) * containerH;

      const maxAllowedPx = Math.max(8, boxHeightPx * 0.72);
      let fontSize = Math.min(maxAllowedPx, boxHeightPx * 0.6);
      fontSize = Math.max(8, fontSize);

      if (ctx) {
        const targetMaxW = Math.max(0, boxWidthPx - 4);
        while (fontSize > 8) {
          ctx.font = `700 ${fontSize}px Inter, system-ui, -apple-system, sans-serif`;
          const textWidth = ctx.measureText(label).width;
          if (textWidth <= targetMaxW) {
            break;
          }
          fontSize = Math.max(8, fontSize - 0.5);
        }
      }

      fontSize = Math.max(8, Math.min(fontSize, maxAllowedPx));
      nextSizes[chip.id] = Math.round(fontSize * 10) / 10;
    }

    setFontSizes(nextSizes);
  }, [chips]);

  // Recompute font sizes when chips or overlayMode change
  useEffect(() => {
    recomputeFontSizes();
  }, [recomputeFontSizes, overlayMode]);

  // ResizeObserver (debounced 100ms) on the image container
  useEffect(() => {
    const container = imageContainerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const observer = new ResizeObserver(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        recomputeFontSizes();
      }, 100);
    });

    observer.observe(container);
    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
  }, [recomputeFontSizes, previewUrl]);

  const executeScan = async (source: File | string) => {
    // Debounce scan trigger: max 1 in-flight request at a time
    if (isScanningRef.current) return;

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setIsOnline(false);
      return;
    }

    if (!hasGeminiApiKey()) {
      return;
    }

    if (isDailyScanCapReached()) {
      setDailyCapHit(true);
      return;
    }

    isScanningRef.current = true;
    playTactileTone('tap');
    setSelectedWord(null);
    setChips([]);
    setFontSizes({});
    setOverlayMode('translate');
    setLastSource(source);
    setScanState('scanning');
    setLoadingPhase('phase1');
    setPhase1Pct(5);
    setErrorMessage(STRINGS.reader.genericError);

    if (typeof source === 'string') {
      setPreviewUrl(source);
    } else {
      const nextUrl = URL.createObjectURL(source);
      setPreviewUrl(nextUrl);
    }

    if (activeAbortRef.current) {
      activeAbortRef.current.abort();
    }
    const abortController = new AbortController();
    activeAbortRef.current = abortController;

    if (phaseTimerRef.current) {
      clearTimeout(phaseTimerRef.current);
    }
    // Phase 1 lasts while compressing image + first 1.5s, then transitions to Phase 2 indeterminate bar
    phaseTimerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setPhase1Pct(30);
        setLoadingPhase('phase2');
      }
    }, 1500);

    try {
      const compressed = await compressImageForGemini(source, (pct) => {
        if (mountedRef.current) {
          setPhase1Pct(Math.min(30, pct));
        }
      });

      if (!mountedRef.current || abortController.signal.aborted) return;

      const items = await scanKannadaImageWithGemini(
        compressed.base64Data,
        abortController.signal
      );

      if (!mountedRef.current || abortController.signal.aborted) return;

      setDailyCapHit(isDailyScanCapReached());

      if (items.length === 0) {
        setScanState('empty');
        return;
      }

      const rawPlaced: PositionedOcrChip[] = items.map((item) => {
        const [ymin, xmin, ymax, xmax] = item.box;
        return {
          id: item.id,
          rawText: item.kn,
          cleanText: item.kn,
          confidence: 99,
          bbox: {
            x0: xmin,
            y0: ymin,
            x1: xmax,
            y1: ymax,
          },
          xPct: item.xPct,
          yPct: item.yPct,
          wPct: item.wPct,
          hPct: item.hPct,
          entry: item.entry,
        };
      });

      const placed = dedupeOverlappingChips(rawPlaced);
      setChips(placed);
      setScanState('done');
      playTactileTone('success');
    } catch (err) {
      if (!mountedRef.current || abortController.signal.aborted) return;
      if (err instanceof GeminiReaderError) {
        if (err.kind === 'aborted') return;
        if (err.kind === 'offline') {
          setIsOnline(false);
          setScanState('idle');
          return;
        }
        if (err.kind === 'daily_cap') {
          setDailyCapHit(true);
          setScanState('idle');
          return;
        }
        setErrorMessage(err.message);
      } else {
        setErrorMessage(STRINGS.reader.genericError);
      }
      setScanState('error');
    } finally {
      isScanningRef.current = false;
      if (phaseTimerRef.current) {
        clearTimeout(phaseTimerRef.current);
        phaseTimerRef.current = null;
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void executeScan(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      void executeScan(file);
    }
  };

  const handleReset = () => {
    playTactileTone('tap');
    if (activeAbortRef.current) {
      activeAbortRef.current.abort();
      activeAbortRef.current = null;
    }
    if (phaseTimerRef.current) {
      clearTimeout(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
    isScanningRef.current = false;
    setSelectedWord(null);
    setChips([]);
    setFontSizes({});
    setPreviewUrl(null);
    setLastSource(null);
    setScanState('idle');
  };

  const handleTapChip = (chip: PositionedOcrChip) => {
    playTactileTone('tap');
    if (chip.entry) {
      setSelectedWord({
        kn: chip.entry.kn,
        translit: chip.entry.translit,
        en: chip.entry.en,
        matched: true,
      });
    } else {
      setSelectedWord({
        kn: chip.cleanText || chip.rawText,
        matched: false,
      });
    }
  };

  const isUnavailable = !isOnline || !hasGeminiApiKey();

  return (
    <div className="w-full space-y-4 pb-24">
      {/* Hidden file input supporting mobile camera capture and file upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Toast when saving from card list */}
      <AnimatePresence>
        {saveToastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: reduce ? 0 : 0.18 }}
            className="fixed top-16 left-1/2 z-50 -translate-x-1/2 rounded-full border border-emerald-500/30 bg-neutral-900/95 px-4 py-2 text-xs font-bold text-white shadow-lg"
          >
            {saveToastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Section 6: Offline or Missing API Key Fallback State */}
      {isUnavailable ? (
        <div
          role="status"
          className="rounded-3xl border border-neutral-200 bg-white p-6 text-center shadow-xs space-y-4"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600">
            <WifiOff size={26} />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <p className="text-base sm:text-lg font-extrabold text-neutral-900">
              {STRINGS.reader.offlineNotice}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            {onSwitchToGuided && (
              <button
                type="button"
                onClick={onSwitchToGuided}
                className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs transition-transform active:scale-95"
              >
                <Camera size={16} />
                <span>{STRINGS.reader.guidedGalleryButton}</span>
              </button>
            )}
            {onOpenRoleplay && (
              <button
                type="button"
                onClick={onOpenRoleplay}
                className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-xs sm:text-sm font-bold text-neutral-800 transition-colors hover:border-primary"
              >
                <MessageCircle size={16} />
                <span>{STRINGS.reader.roleplayButton}</span>
              </button>
            )}
          </div>
        </div>
      ) : dailyCapHit && scanState === 'idle' ? (
        /* Section 7: Daily Cap Reached Guardrail */
        <div
          role="status"
          className="rounded-3xl border border-neutral-200 bg-white p-6 text-center shadow-xs space-y-4"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles size={26} />
          </div>
          <p className="text-base sm:text-lg font-extrabold text-neutral-900">
            {STRINGS.reader.dailyCapReached}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            {onSwitchToGuided && (
              <button
                type="button"
                onClick={onSwitchToGuided}
                className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs transition-transform active:scale-95"
              >
                <Camera size={16} />
                <span>{STRINGS.reader.guidedGalleryButton}</span>
              </button>
            )}
            {onOpenRoleplay && (
              <button
                type="button"
                onClick={onOpenRoleplay}
                className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-xs sm:text-sm font-bold text-neutral-800 transition-colors hover:border-primary"
              >
                <MessageCircle size={16} />
                <span>{STRINGS.reader.roleplayButton}</span>
              </button>
            )}
          </div>
        </div>
      ) : scanState === 'idle' ? (
        /* Big Dashed Dropzone */
        <div className="space-y-4">
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex min-h-[240px] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed p-6 text-center transition-all active:scale-[0.99] ${
              isDragging
                ? 'border-primary bg-primary/10'
                : 'border-neutral-300 bg-white hover:border-primary hover:bg-neutral-50/80'
            }`}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Camera size={30} strokeWidth={1.8} />
            </div>
            <div className="space-y-1">
              <p className="text-base sm:text-lg font-extrabold text-neutral-900">
                {STRINGS.reader.dropzoneTitle}
              </p>
              <p className="text-xs sm:text-sm text-neutral-500 max-w-xs mx-auto">
                {STRINGS.reader.dropzoneSubtitle}
              </p>
            </div>
            <span className="mt-1 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs">
              <Upload size={14} />
              <span>{STRINGS.reader.choosePhotoButton}</span>
            </span>
          </div>
        </div>
      ) : (
        /* Preview + Scan Animation + Strict Google-Lens Bbox-Fitted Overlays */
        <div className="space-y-3">
          <div
            ref={imageContainerRef}
            className="relative w-full overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-950 shadow-md"
          >
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Scanned Kannada preview"
                onLoad={recomputeFontSizes}
                className="block w-full h-auto select-none"
                draggable={false}
              />
            )}

            {/* Segmented Toggle Top-Right: [Translate | Original] */}
            {scanState === 'done' && (
              <div
                role="group"
                aria-label="Overlay display mode"
                className="pointer-events-auto absolute top-2.5 right-2.5 z-20 inline-flex items-center rounded-xl border border-neutral-200/80 bg-white/95 p-0.5 shadow-md backdrop-blur-xs"
              >
                <button
                  type="button"
                  onClick={() => {
                    playTactileTone('tap');
                    setOverlayMode('translate');
                  }}
                  className={`cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                    overlayMode === 'translate'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-neutral-700 hover:text-neutral-950'
                  }`}
                >
                  Translate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playTactileTone('tap');
                    setOverlayMode('original');
                  }}
                  className={`cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                    overlayMode === 'original'
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-neutral-700 hover:text-neutral-950'
                  }`}
                >
                  Original
                </button>
              </div>
            )}

            {/* Scanning Overlay with sweeping primary gradient line (1.2s loop) & Two-Phase Copy */}
            {scanState === 'scanning' && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/45 backdrop-blur-[1px]">
                {!reduce && (
                  <motion.div
                    initial={{ top: '0%' }}
                    animate={{ top: ['0%', '96%', '0%'] }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                    className="pointer-events-none absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_16px_2px_rgba(108,92,231,0.9)]"
                  />
                )}

                <div className="w-64 max-w-[85%] rounded-2xl border border-white/20 bg-neutral-950/90 px-4 py-3.5 text-center text-white shadow-xl space-y-2.5">
                  <p className="text-sm font-bold">
                    {loadingPhase === 'phase1'
                      ? STRINGS.reader.scanningPhase1
                      : STRINGS.reader.scanningPhase2}
                  </p>
                  <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                    {loadingPhase === 'phase1' ? (
                      <div
                        style={{ width: `${Math.max(8, Math.min(30, phase1Pct))}%` }}
                        className="h-full rounded-full bg-primary transition-all duration-200"
                      />
                    ) : reduce ? (
                      <div className="h-full w-full rounded-full bg-primary/80 animate-pulse" />
                    ) : (
                      <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: '250%' }}
                        transition={{
                          duration: 1.1,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                        className="h-full w-2/5 rounded-full bg-primary"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* True Google-Lens Style In-Place Bbox Overlays */}
            {scanState === 'done' &&
              overlayMode === 'translate' &&
              chips.map((chip) => {
                if (chip.entry) {
                  const displayLabel = chip.entry.en;
                  const fittedPx = fontSizes[chip.id] ?? 10;
                  const isHovered = activeHoverId === chip.id;
                  const isSelected = selectedWord?.kn === chip.entry.kn;

                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => handleTapChip(chip)}
                      onMouseEnter={() => setActiveHoverId(chip.id)}
                      onMouseLeave={() => setActiveHoverId(null)}
                      aria-label={`${chip.entry.kn} — ${chip.entry.en}`}
                      title={`${chip.entry.kn} (${chip.entry.translit || ''}) — ${chip.entry.en}`}
                      style={{
                        left: `${chip.xPct}%`,
                        top: `${chip.yPct}%`,
                        width: `${chip.wPct}%`,
                        height: `${chip.hPct}%`,
                        fontSize: `${fittedPx}px`,
                      }}
                      className={`pointer-events-auto absolute z-10 m-0 flex cursor-pointer items-center justify-center overflow-hidden rounded-[2px] px-[2px] py-0 whitespace-nowrap font-bold leading-none select-none transition-colors ${
                        isHovered || isSelected
                          ? 'bg-primary text-white ring-1 ring-white z-20'
                          : 'bg-white/95 text-neutral-900'
                      }`}
                    >
                      <span className="block max-w-full overflow-hidden whitespace-nowrap leading-none">
                        {displayLabel}
                      </span>
                    </button>
                  );
                }

                // Unmatched words: subtle thin dashed outline box strictly at bbox
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => handleTapChip(chip)}
                    onMouseEnter={() => setActiveHoverId(chip.id)}
                    onMouseLeave={() => setActiveHoverId(null)}
                    aria-label={`Detected word ${chip.cleanText}`}
                    style={{
                      left: `${chip.xPct}%`,
                      top: `${chip.yPct}%`,
                      width: `${chip.wPct}%`,
                      height: `${chip.hPct}%`,
                    }}
                    className={`pointer-events-auto absolute z-10 m-0 cursor-pointer rounded-[2px] border border-dashed p-0 transition-colors ${
                      activeHoverId === chip.id
                        ? 'border-primary bg-primary/10'
                        : 'border-neutral-400/60 bg-transparent hover:border-primary/70'
                    }`}
                  />
                );
              })}
          </div>

          {/* Section 5: Translated Text Panel with Quick Actions + Save to Notes */}
          {scanState === 'done' && (
            <div className="space-y-3 pt-1">
              {/* Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-neutral-200 bg-white p-3.5 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <FileText size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                      <span>{STRINGS.reader.translatedTextTitle}</span>
                      <span className="text-[11px] font-semibold text-neutral-400">
                        ({STRINGS.reader.itemsTranslated(chips.length)})
                      </span>
                    </h3>
                    <p className="text-[11px] text-neutral-500">
                      {STRINGS.reader.tapHint}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyAll}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition-colors hover:border-primary hover:text-primary"
                  >
                    {copiedAll ? (
                      <>
                        <Check size={13} className="text-emerald-500" />
                        <span className="text-emerald-600">
                          {STRINGS.reader.copied}
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>{STRINGS.reader.copyAll}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition-opacity hover:opacity-95"
                  >
                    <RotateCcw size={13} />
                    <span>{STRINGS.reader.newPhoto}</span>
                  </button>
                </div>
              </div>

              {/* Cards List */}
              <div className="grid grid-cols-1 gap-2.5">
                {chips.map((chip, index) => {
                  const entry = chip.entry;
                  const isHovered = activeHoverId === chip.id;
                  const isPlaying = speakingId === chip.id;
                  const isItemCopied = copiedId === chip.id;

                  if (!entry) return null;
                  const saved = wallet.isSaved(entry.kn);

                  return (
                    <div
                      key={chip.id}
                      onMouseEnter={() => setActiveHoverId(chip.id)}
                      onMouseLeave={() => setActiveHoverId(null)}
                      onClick={() => handleTapChip(chip)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleTapChip(chip);
                        }
                      }}
                      className={`group relative rounded-2xl border p-3.5 transition-all cursor-pointer ${
                        isHovered || selectedWord?.kn === entry.kn
                          ? 'border-primary bg-primary/[0.03] shadow-xs ring-1 ring-primary/30'
                          : 'border-neutral-200 bg-white hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-[11px] font-sans font-bold text-neutral-400">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className="text-base sm:text-lg font-extrabold tracking-tight text-neutral-900">
                              {entry.kn}
                            </span>
                          </div>

                          <p className="text-sm font-semibold text-neutral-800 pl-5 sm:pl-6 leading-snug">
                            {entry.en}
                          </p>

                          {entry.translit && (
                            <p className="text-xs font-sans font-medium text-primary pl-5 sm:pl-6">
                              &ldquo;{entry.translit}&rdquo;
                            </p>
                          )}
                        </div>

                        {/* Actions Cluster */}
                        <div
                          className="flex items-center gap-1.5 shrink-0 pt-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Audio pronunciation button */}
                          <button
                            type="button"
                            onClick={() =>
                              handleSpeakItem(entry.kn, entry.translit, chip.id)
                            }
                            aria-label={`Listen to ${entry.kn}`}
                            title="Hear pronunciation"
                            className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border transition-all active:scale-95 ${
                              isPlaying
                                ? 'border-primary bg-primary text-white shadow-xs animate-pulse'
                                : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-primary hover:text-primary'
                            }`}
                          >
                            <Volume2 size={15} />
                          </button>

                          {/* Save to Notes button */}
                          <button
                            type="button"
                            onClick={() => handleSaveCardItem(entry)}
                            aria-label={
                              saved
                                ? `${entry.kn} saved in Notes`
                                : `Save ${entry.kn} to Notes`
                            }
                            title={saved ? 'Saved in Notes ✓' : 'Save to Notes'}
                            className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border transition-all active:scale-95 ${
                              saved
                                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600'
                                : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-primary hover:text-primary'
                            }`}
                          >
                            <Bookmark
                              size={14}
                              className={saved ? 'fill-current' : ''}
                            />
                          </button>

                          {/* Copy button */}
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyText(
                                `${entry.kn} (${entry.translit}) — ${entry.en}`,
                                chip.id
                              )
                            }
                            aria-label={`Copy translation of ${entry.kn}`}
                            title="Copy text"
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-primary hover:text-primary transition-all active:scale-95"
                          >
                            {isItemCopied ? (
                              <Check size={14} className="text-emerald-500" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>

                          {/* Practice button */}
                          <button
                            type="button"
                            onClick={() => handleTapChip(chip)}
                            aria-label={`Practice speaking ${entry.kn}`}
                            title="Practice speaking"
                            className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-all active:scale-95"
                          >
                            <span>Practice</span>
                            <span aria-hidden="true">&rarr;</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 5: Warm Neutral Empty Result ([] from API) */}
          {scanState === 'empty' && (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/90 p-5 text-center space-y-3">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-neutral-200/80 text-neutral-700">
                <Search size={20} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-neutral-900">
                  {STRINGS.reader.noTextFound}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-2xs"
                >
                  <RotateCcw size={13} />
                  <span>{STRINGS.reader.tryAgain}</span>
                </button>
              </div>
            </div>
          )}

          {/* Error State (Rate Limit 429 / Timeout / Network Failure after retry) */}
          {scanState === 'error' && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-center space-y-3">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                <AlertCircle size={22} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-neutral-900">
                  {errorMessage}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {lastSource && (
                  <button
                    type="button"
                    onClick={() => void executeScan(lastSource)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white"
                  >
                    <RotateCcw size={13} />
                    <span>{STRINGS.reader.tryAgain}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-xs font-semibold text-neutral-700"
                >
                  <span>{STRINGS.reader.clearNewPhoto}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Shared Word Translation & Practice Popover (portaled to document.body at z-50) */}
      <WordTranslationPopover
        word={selectedWord}
        onClose={() => setSelectedWord(null)}
        onOpenRoleplayWithWord={onOpenRoleplayWithWord}
      />
    </div>
  );
};
