'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Volume2, X, Bookmark, RotateCcw } from 'lucide-react';
import { useWallet, type SavedItem } from '@/lib/wallet/store';
import { STRINGS } from '@/lib/i18n';
import { speakKannada } from '@/lib/reader/tts';
import { playTactileTone } from '@/src/data/kanglishData';
import { ProfileCardBackdropDoodle } from '@/src/components/UnitBackgroundDoodles';

export const NotesDeckSection: React.FC = () => {
  const reduce = useReducedMotion() ?? false;
  const wallet = useWallet();
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [undoItem, setUndoItem] = useState<SavedItem | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  const handlePlay = (item: SavedItem) => {
    playTactileTone('tap');
    setSpeakingId(item.id);
    speakKannada(item.kn, {
      fallbackTranslit: item.translit,
      onStart: () => setSpeakingId(item.id),
      onEnd: () => setSpeakingId(null),
    });
  };

  const handleRemove = (item: SavedItem) => {
    playTactileTone('tap');
    wallet.removeItem(item.id);
    setUndoItem(item);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      setUndoItem(null);
    }, 4000);
  };

  const handleUndo = () => {
    if (!undoItem) return;
    playTactileTone('success');
    wallet.restoreItem(undoItem);
    setUndoItem(null);
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  };

  return (
    <div
      id="profile-notes-section"
      data-notes-deck="true"
      className="glass-strong relative overflow-hidden p-5 sm:p-6"
    >
      <ProfileCardBackdropDoodle variant="notes" />

      <div className="relative z-10 space-y-4">
        {/* Header: "My Words" + count badge */}
        <div className="flex flex-wrap items-center justify-between gap-2 pr-14 sm:pr-24">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600/12 border border-teal-500/25 text-teal-700 shadow-2xs">
              <Bookmark className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-lg text-neutral-900">
                  {STRINGS.wallet.title}
                </h2>
                <span className="inline-flex items-center rounded-full bg-teal-600/12 border border-teal-500/20 px-2.5 py-0.5 text-xs font-sans font-bold text-teal-800">
                  {STRINGS.wallet.savedCountBadge(wallet.count)}
                </span>
              </div>
              <p className="text-xs text-neutral-600">
                {STRINGS.wallet.subtitle(wallet.count, wallet.maxItems)}
              </p>
            </div>
          </div>
        </div>

        {/* 4-second Undo Toast on Remove */}
        <AnimatePresence>
          {undoItem && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: reduce ? 0 : 0.15 }}
              className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-300 bg-neutral-900 px-4 py-2.5 text-xs font-medium text-white shadow-md"
            >
              <span className="truncate">
                Removed <strong className="font-bold">{undoItem.kn}</strong> ({undoItem.en})
              </span>
              <button
                type="button"
                onClick={handleUndo}
                className="min-h-[36px] inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-xl bg-primary px-3 py-1 text-xs font-bold text-white hover:opacity-95 touch-manipulation"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{STRINGS.wallet.undoButton}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state vs Saved Cards list */}
        {wallet.items.length === 0 ? (
          <div className="rounded-2xl border border-teal-200/80 bg-white/80 backdrop-blur-xs p-6 text-center shadow-2xs">
            <p className="text-sm font-medium text-neutral-700 max-w-md mx-auto leading-relaxed">
              {STRINGS.wallet.emptyState}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {wallet.items.map((item) => {
              const isSpeaking = speakingId === item.id;
              return (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-teal-200/80 bg-white/90 p-3.5 shadow-2xs transition-colors hover:border-teal-400"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-neutral-900">
                        {item.kn}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-sans font-bold uppercase tracking-wider ${
                          item.source === 'reader'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-cyan-500/10 text-cyan-700'
                        }`}
                      >
                        {item.source === 'reader'
                          ? STRINGS.wallet.sourceReader
                          : STRINGS.wallet.sourceRoleplay}
                      </span>
                    </div>

                    {item.translit && (
                      <p className="font-sans text-xs sm:text-sm font-medium text-neutral-500">
                        {item.translit}
                      </p>
                    )}

                    <p className="text-sm font-semibold text-neutral-800">
                      {item.en}
                    </p>
                  </div>

                  {/* Actions: 🔊 Replay + ✕ Remove (minimum 44x44px hit targets) */}
                  <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handlePlay(item)}
                      aria-label={`Listen to ${item.kn}`}
                      title="Hear pronunciation"
                      className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border transition-all active:scale-95 touch-manipulation ${
                        isSpeaking
                          ? 'border-primary bg-primary text-white shadow-xs'
                          : 'border-neutral-200 bg-neutral-50 text-primary hover:border-primary'
                      }`}
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemove(item)}
                      aria-label={`Remove ${item.kn} from Notes`}
                      title="Remove from Notes"
                      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-500 transition-colors hover:border-rose-400 hover:bg-rose-50 hover:text-rose-600 touch-manipulation"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
