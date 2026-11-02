'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { MapPin, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  GUIDED_SCENES,
  type GuidedScene,
  type GuidedHotspot,
} from '@/lib/reader/guidedData';
import {
  WordTranslationPopover,
  type SelectedWordItem,
} from './WordTranslationPopover';
import { playTactileTone } from '@/src/data/kanglishData';

export interface GuidedGalleryProps {
  onOpenRoleplayWithWord?: (word: {
    kn: string;
    translit: string;
    en: string;
  }) => void;
}

export const GuidedGallery: React.FC<GuidedGalleryProps> = ({
  onOpenRoleplayWithWord,
}) => {
  const reduce = useReducedMotion() ?? false;
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [showDiscoveryHint, setShowDiscoveryHint] = useState(true);
  const [pulsingHotspotKey, setPulsingHotspotKey] = useState<string | null>(
    null
  );
  const [selectedWord, setSelectedWord] = useState<SelectedWordItem | null>(
    null
  );

  const carouselRef = useRef<HTMLDivElement | null>(null);
  const activeScene: GuidedScene =
    GUIDED_SCENES[activeSceneIndex] || GUIDED_SCENES[0];

  const handleSelectScene = (idx: number) => {
    playTactileTone('tap');
    setActiveSceneIndex(idx);
    setSelectedWord(null);
    setPulsingHotspotKey(null);
    const container = carouselRef.current;
    if (container && container.children[idx]) {
      (container.children[idx] as HTMLElement).scrollIntoView({
        behavior: reduce ? 'auto' : 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  };

  const handleTapHotspot = (hotspot: GuidedHotspot, idx: number) => {
    playTactileTone('tap');
    setShowDiscoveryHint(false);
    const key = `${activeScene.id}-${idx}`;
    setPulsingHotspotKey(key);
    setSelectedWord({
      kn: hotspot.kn,
      translit: hotspot.translit,
      en: hotspot.en,
      matched: true,
    });
  };

  return (
    <div className="w-full space-y-4 pb-24">
      {/* Horizontal snap-scroll carousel of 6 scene cards */}
      <div className="space-y-2.5">
        <div
          ref={carouselRef}
          className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {GUIDED_SCENES.map((scene, idx) => {
            const isActive = idx === activeSceneIndex;
            return (
              <button
                key={scene.id}
                type="button"
                onClick={() => handleSelectScene(idx)}
                className={`snap-center shrink-0 cursor-pointer rounded-2xl border px-3.5 py-2.5 text-left transition-all active:scale-[0.98] ${
                  isActive
                    ? 'border-primary bg-primary/10 text-neutral-900 shadow-xs'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'bg-neutral-100 text-neutral-500'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="whitespace-nowrap text-xs sm:text-sm font-bold">
                    {scene.title}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1 text-[11px] text-neutral-500">
                  <MapPin size={11} className="shrink-0" />
                  <span className="truncate max-w-[200px]">{scene.place}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Dots indicator + prev/next controls */}
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() =>
              handleSelectScene(
                (activeSceneIndex - 1 + GUIDED_SCENES.length) %
                  GUIDED_SCENES.length
              )
            }
            aria-label="Previous scene"
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100"
          >
            <ChevronLeft size={16} />
          </button>

          <div
            className="flex items-center gap-1.5"
            role="tablist"
            aria-label="Guided scenes"
          >
            {GUIDED_SCENES.map((scene, idx) => {
              const active = idx === activeSceneIndex;
              return (
                <button
                  key={scene.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={`Scene ${idx + 1}: ${scene.title}`}
                  onClick={() => handleSelectScene(idx)}
                  className={`h-2 cursor-pointer rounded-full transition-all ${
                    active
                      ? 'w-6 bg-primary'
                      : 'w-2 bg-neutral-300 hover:bg-neutral-400'
                  }`}
                />
              );
            })}
          </div>

          <button
            type="button"
            onClick={() =>
              handleSelectScene((activeSceneIndex + 1) % GUIDED_SCENES.length)
            }
            aria-label="Next scene"
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Active Scene Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-neutral-900">
            {activeScene.title}
          </h2>
          <p className="flex items-center gap-1 text-xs text-neutral-500">
            <MapPin size={12} />
            <span>{activeScene.place}</span>
          </p>
        </div>

        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          {activeScene.hotspots.length} tappable words
        </span>
      </div>

      {/* Full-bleed Scene Photo with Invisible Tappable Hotspots */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-900 shadow-md">
        <img
          src={activeScene.imagePath}
          alt={activeScene.title}
          className="block w-full h-auto select-none"
          draggable={false}
        />

        {/* Floating "Tap the words" discovery hint on first open (dismissed on first tap) */}
        <AnimatePresence>
          {showDiscoveryHint && (
            <motion.div
              key="tap-words-hint"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: reduce ? 0 : 0.2 }}
              onClick={() => setShowDiscoveryHint(false)}
              className="pointer-events-auto absolute top-3 left-1/2 z-20 flex -translate-x-1/2 cursor-pointer items-center gap-2 rounded-full border border-white/25 bg-neutral-950/85 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-md"
            >
              <Sparkles size={13} className="text-amber-300 shrink-0" />
              <span>Tap the words</span>
              <span className="flex items-center gap-1 pl-0.5" aria-hidden="true">
                {[0, 1, 2].map((dotIdx) => (
                  <span
                    key={dotIdx}
                    className={`h-1.5 w-1.5 rounded-full bg-primary-fixed ${
                      reduce ? '' : 'animate-pulse'
                    }`}
                    style={
                      reduce
                        ? undefined
                        : { animationDelay: `${dotIdx * 220}ms` }
                    }
                  />
                ))}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hotspot Overlay Buttons */}
        {activeScene.hotspots.map((spot, idx) => {
          const key = `${activeScene.id}-${idx}`;
          const isSelected = pulsingHotspotKey === key && selectedWord !== null;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleTapHotspot(spot, idx)}
              aria-label={`${spot.kn} (${spot.translit}): ${spot.en}`}
              style={{
                left: `${spot.x}%`,
                top: `${spot.y}%`,
                width: `${spot.w}%`,
                height: `${spot.h}%`,
              }}
              className={`absolute z-10 cursor-pointer rounded-lg transition-all focus-visible:ring-2 focus-visible:ring-primary ${
                isSelected
                  ? 'ring-3 ring-primary bg-primary/25 shadow-[0_0_0_4px_rgba(108,92,231,0.3)]'
                  : 'bg-transparent hover:bg-primary/15 active:bg-primary/25'
              }`}
            >
              {isSelected && !reduce && (
                <motion.span
                  layoutId="guided-hotspot-ring"
                  initial={{ scale: 0.9, opacity: 0.9 }}
                  animate={{ scale: 1.08, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 22 }}
                  className="pointer-events-none absolute inset-0 rounded-lg border-2 border-primary"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Word Strip below photo for 1-tap accessibility & quick scanning */}
      <div className="space-y-1.5">
        <span className="px-1 text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
          Words on this board (tap on image or below)
        </span>
        <div className="flex flex-wrap gap-1.5">
          {activeScene.hotspots.map((spot, idx) => {
            const key = `${activeScene.id}-${idx}`;
            const active = pulsingHotspotKey === key && selectedWord !== null;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleTapHotspot(spot, idx)}
                className={`cursor-pointer rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                  active
                    ? 'border-primary bg-primary text-white shadow-xs'
                    : 'border-neutral-200 bg-white text-neutral-800 hover:border-primary/60'
                }`}
              >
                <span>{spot.kn}</span>
                <span className="ml-1.5 opacity-70 font-sans text-[11px]">
                  {spot.translit}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Word Translation & Practice Popover */}
      <WordTranslationPopover
        word={selectedWord}
        onClose={() => setSelectedWord(null)}
        onOpenRoleplayWithWord={onOpenRoleplayWithWord}
      />
    </div>
  );
};
