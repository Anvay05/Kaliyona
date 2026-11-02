import React, { useState } from 'react';
import {
  MapPin,
  Mic,
  TrendingUp,
  Trophy,
  Play,
  ArrowRight,
  Volume2,
  Flame,
  Heart,
  Menu,
  X,
  BookOpen,
} from 'lucide-react';
import { SITUATIONS, Situation, speakKanglishPhrase } from '../data/kanglishData';
import { AnnaMascot } from './AnnaMascot';

interface LandingPageProps {
  onStartOnboarding: () => void;
  onEnterApp: (initialTab?: string, situationId?: string) => void;
  onTryLesson: (situationId?: string) => void;
  streak: number;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartOnboarding,
  onEnterApp,
  onTryLesson,
  streak,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      className="min-h-screen text-[var(--ink)]"
      style={{
        backgroundColor: 'var(--bg)',
        backgroundImage:
          'radial-gradient(800px 400px at 70% -10%, rgba(79,140,255,0.12), transparent)',
      }}
    >
      {/* 4.1 TOP NAV */}
      <header className="sticky top-0 z-40 h-16 bg-[var(--surface)]/95 backdrop-blur-md border-b border-[var(--line)]">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 text-left cursor-pointer whitespace-nowrap shrink-0"
          >
            <img
              src="/assets/logo-icon.webp"
              alt=""
              width={28}
              height={28}
              loading="eager"
              draggable={false}
              className="w-7 h-7 object-contain shrink-0 block"
            />
            <span className="font-headline-md text-on-surface text-xl tracking-tight">
              Kaliyona
            </span>
          </button>

          {/* Zone 2: Center Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[var(--muted)]">
            <button
              onClick={() => scrollToSection('situations-bento')}
              className="hover:text-[var(--ink)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Situations
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-[var(--ink)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              How it works
            </button>
            <button
              onClick={() => onEnterApp('progress')}
              className="hover:text-[var(--ink)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Progress
            </button>
            <button
              onClick={() => onEnterApp('explore')}
              className="hover:text-[var(--ink)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Phrasebook
            </button>
          </nav>

          {/* Zone 3: Actions */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <button
              onClick={() => onEnterApp('home')}
              className="btn-ghost !py-2 !px-4 !text-sm"
            >
              Open Dashboard
            </button>
            <button
              onClick={onStartOnboarding}
              className="btn-primary !py-2 !px-5 !text-sm"
            >
              Start Free
            </button>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Menu"
            className="md:hidden w-11 h-11 rounded-xl flex items-center justify-center text-[var(--ink)] hover:bg-[var(--surface-warm)]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Slide-down Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[var(--surface)] border-b border-[var(--line)] px-4 pt-3 pb-5 space-y-3 shadow-lg">
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => scrollToSection('situations-bento')}
                className="text-left py-2 px-3 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--surface-warm)]"
              >
                Situations
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="text-left py-2 px-3 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--surface-warm)]"
              >
                How it works
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onEnterApp('progress');
                }}
                className="text-left py-2 px-3 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--surface-warm)]"
              >
                Progress
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onEnterApp('explore');
                }}
                className="text-left py-2 px-3 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--surface-warm)]"
              >
                Phrasebook
              </button>
            </div>
            <div className="pt-2 flex gap-3">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onEnterApp('home');
                }}
                className="btn-ghost flex-1 !py-2.5 !text-sm"
              >
                Dashboard
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onStartOnboarding();
                }}
                className="btn-primary flex-1 !py-2.5 !text-sm"
              >
                Start Free
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 4.2 HERO — Two-column on desktop (stacked on mobile) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 text-[var(--accent)] mono-label">
              <span>ಕನ್ನಡ FOR EVERYONE</span>
              <span aria-hidden="true">·</span>
              <span>LEARN. SPEAK. BELONG.</span>
            </div>

            <h1
              className="font-display font-bold tracking-tight text-[var(--ink)]"
              style={{
                fontSize: 'var(--text-hero)',
                lineHeight: 1.05,
                textWrap: 'balance',
              }}
            >
              Speak Kannada,
              <br />
              <span className="text-[var(--accent)]">Own Bengaluru.</span>
            </h1>

            <p className="text-[var(--muted)] text-base sm:text-lg leading-relaxed max-w-[44ch]">
              Fun, practical Kannada through real situations — autos, darshinis, PG
              hunting and office chai. No textbooks. No scripts to memorize. Just
              Kanglish.
            </p>

            {/* CTA Row */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button onClick={onStartOnboarding} className="btn-primary">
                <span>Start Learning — It&apos;s Free</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onTryLesson('auto-ride')}
                className="btn-ghost"
              >
                <Play className="w-4 h-4 fill-[var(--accent)] text-[var(--accent)]" />
                <span>Try a Lesson</span>
              </button>
            </div>

            {/* Trust Mono Line */}
            <div className="pt-2 mono-label text-[var(--muted)] flex flex-wrap items-center gap-2">
              <span className="text-[var(--ink)] font-semibold">6 SITUATIONS</span>
              <span>·</span>
              <span className="text-[var(--ink)] font-semibold">200+ PHRASES</span>
              <span>·</span>
              <span className="text-[var(--ink)] font-semibold">5 MIN A DAY</span>
            </div>

            {/* 4.3 FEATURES — 2x2 grid of 4 icon-tile rows */}
            <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3.5 p-3.5 rounded-[18px] bg-[var(--surface)] border border-[var(--line)]">
                <div
                  className="w-11 h-11 rounded-[14px] shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: 'var(--tile-1)' }}
                >
                  <MapPin className="w-[22px] h-[22px] text-[var(--accent)]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[15px] text-[var(--ink)]">
                    Interactive Situations
                  </h3>
                  <p className="text-[13px] text-[var(--muted)] leading-snug mt-0.5">
                    Learn through autos, darshinis &amp; real life.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-[18px] bg-[var(--surface)] border border-[var(--line)]">
                <div
                  className="w-11 h-11 rounded-[14px] shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: 'var(--tile-2)' }}
                >
                  <Mic className="w-[22px] h-[22px] text-[var(--accent2)]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[15px] text-[var(--ink)]">
                    Practice Speaking
                  </h3>
                  <p className="text-[13px] text-[var(--muted)] leading-snug mt-0.5">
                    AI roleplay + pronunciation checks, zero judgment.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-[18px] bg-[var(--surface)] border border-[var(--line)]">
                <div
                  className="w-11 h-11 rounded-[14px] shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: 'var(--tile-3)' }}
                >
                  <TrendingUp className="w-[22px] h-[22px] text-[var(--success)]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[15px] text-[var(--ink)]">
                    Track Progress
                  </h3>
                  <p className="text-[13px] text-[var(--muted)] leading-snug mt-0.5">
                    Streaks, XP and goals that keep you coming back.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-[18px] bg-[var(--surface)] border border-[var(--line)]">
                <div
                  className="w-11 h-11 rounded-[14px] shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: 'var(--tile-4)' }}
                >
                  <Trophy className="w-[22px] h-[22px] text-[var(--streak)]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[15px] text-[var(--ink)]">
                    Earn Rewards
                  </h3>
                  <p className="text-[13px] text-[var(--muted)] leading-snug mt-0.5">
                    Badges for every street you conquer.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: REAL RENDERED PHONE-MOCKUP COLLAGE (Mirrors Reference A) */}
          <div className="lg:col-span-6 relative">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
              {/* Phone Card 1: Home Screen Mockup (Tilted -2deg on desktop) */}
              <div
                onClick={() => onEnterApp('home')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onEnterApp('home')}
                className="sm:col-span-7 card-lift p-5 bg-[var(--surface)] lg:-rotate-2 hover:rotate-0 transition-transform duration-200 cursor-pointer"
              >
                {/* Mini Status + Top Bar */}
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono-accent text-xs font-semibold text-[var(--ink)]">
                    9:41
                  </span>
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--line)]"
                    style={{ backgroundColor: 'var(--accent2-soft)' }}
                  >
                    <Flame className="w-3.5 h-3.5 text-[var(--streak)] fill-[var(--streak)]" />
                    <span className="font-mono-accent text-xs font-semibold text-[var(--ink)]">
                      {streak}
                    </span>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="font-display font-semibold text-xl text-[var(--ink)]">
                    Hello, Alex!
                  </p>
                  <p className="mono-label text-[var(--muted)] mt-0.5">
                    WHAT DO YOU WANT TO LEARN TODAY?
                  </p>
                </div>

                {/* Signature Gradient Continue Card */}
                <div className="signature-gradient rounded-[22px] p-4 text-white relative overflow-hidden mb-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-1.5 z-10">
                      <span className="mono-label text-white/80 block !text-[10px]">
                        PICK UP WHERE YOU LEFT OFF
                      </span>
                      <h4 className="font-display font-semibold text-lg leading-tight">
                        Auto Ride Basics
                      </h4>
                      <div className="flex items-center gap-2 pt-1">
                        <div className="w-28 h-2 rounded-full bg-white/25 overflow-hidden">
                          <div className="h-full bg-white rounded-full w-[65%]" />
                        </div>
                        <span className="font-mono-accent text-xs font-medium">
                          65%
                        </span>
                      </div>
                      <div className="pt-2">
                        <span className="inline-flex items-center gap-1.5 bg-white text-[var(--accent-deep)] font-semibold text-xs px-3.5 py-2 rounded-full shadow-xs">
                          Continue Learning
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>

                    {/* Auto Anna + Namaskāra speech bubble */}
                    <div className="flex flex-col items-end shrink-0">
                      <div className="bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)] px-2.5 py-1 rounded-xl rounded-br-none text-[11px] font-mono-accent font-semibold shadow-xs mb-1">
                        Namaskāra!
                      </div>
                      <div className="select-none">
                        <AnnaMascot state="idle" size={60} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mini My Situations Rows */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-semibold text-sm text-[var(--ink)]">
                      My Situations
                    </span>
                    <span className="mono-label text-[var(--accent)] !text-[10px]">
                      VIEW ALL
                    </span>
                  </div>

                  {SITUATIONS.slice(0, 3).map((sit) => (
                    <div
                      key={sit.id}
                      className="flex items-center gap-3 p-2.5 rounded-2xl bg-[var(--surface-warm)] border border-[var(--line)]"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: sit.tileTint }}
                      >
                        <MapPin className="w-4 h-4 text-[var(--accent)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[var(--ink)] truncate">
                          {sit.title}
                        </p>
                        <p className="mono-label text-[var(--muted)] !text-[10px] mt-0.5">
                          {sit.progressPercent}% COMPLETED
                        </p>
                        <div className="w-full h-1.5 bg-[var(--bg)] rounded-full overflow-hidden mt-1 border border-[var(--line)]">
                          <div
                            className="h-full bg-[var(--accent)] rounded-full"
                            style={{ width: `${sit.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column of Collage: Lesson Card + Speak Card */}
              <div className="sm:col-span-5 space-y-5">
                {/* Phone Card 2: Interactive Lesson Preview (Tilted +2deg) */}
                <div
                  onClick={() => onTryLesson('auto-ride')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onTryLesson('auto-ride')}
                  className="card-lift p-4 bg-[var(--surface)] lg:rotate-2 hover:rotate-0 transition-transform duration-200 cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="mono-label text-[var(--muted)] !text-[10px]">
                      3 / 10
                    </span>
                    <div className="flex-1 mx-2.5 h-2 rounded-full bg-[var(--surface-warm)] overflow-hidden">
                      <div className="w-1/3 h-full bg-[var(--accent)] rounded-full" />
                    </div>
                    <Heart className="w-4 h-4 text-[var(--error)] fill-[var(--error)]" />
                  </div>

                  <p className="font-semibold text-xs text-[var(--ink)] mb-2">
                    Translate this Kanglish phrase
                  </p>

                  {/* Character + Speech Bubble */}
                  <div className="p-3 rounded-2xl bg-[var(--surface-warm)] flex items-center gap-3 mb-3">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden"
                      style={{ backgroundColor: 'var(--tile-1)' }}
                    >
                      <AnnaMascot state="idle" size={38} />
                    </div>
                    <div className="bg-[var(--surface)] p-2.5 rounded-xl border border-[var(--line)] flex-1">
                      <div className="flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                        <span className="text-xs font-medium text-[var(--ink)]">
                          ಮೀಟರ್ ಹಾಕಿ ಅಣ್ಣ
                        </span>
                      </div>
                      <p className="font-mono-accent text-[11px] font-medium text-[var(--accent2)] mt-0.5">
                        &ldquo;Meter haaki anna&rdquo;
                      </p>
                    </div>
                  </div>

                  {/* Word Bank Chips */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {['Put', 'on', 'the', 'meter', 'brother'].map((word) => (
                      <span
                        key={word}
                        className="px-2.5 py-1 rounded-lg bg-[var(--surface-warm)] border border-[var(--line)] text-[11px] font-medium text-[var(--ink)] shadow-2xs"
                      >
                        {word}
                      </span>
                    ))}
                  </div>

                  <div className="w-full py-2 rounded-xl bg-[var(--accent)] border-b-[3px] border-[var(--accent-deep)] text-white text-center text-xs font-semibold">
                    Check Answer
                  </div>
                </div>

                {/* Phone Card 3: Speak / Mic Pulse Preview */}
                <div
                  onClick={() => onEnterApp('practice')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onEnterApp('practice')}
                  className="card-lift p-4 bg-[var(--surface)] lg:-rotate-1 hover:rotate-0 transition-transform duration-200 cursor-pointer text-center"
                >
                  <div className="flex items-center justify-between text-left mb-2">
                    <span className="font-semibold text-xs text-[var(--ink)]">
                      Speak this sentence
                    </span>
                    <span className="mono-label text-[var(--success)] !text-[10px]">
                      AI PRONUNCIATION
                    </span>
                  </div>
                  <p className="font-mono-accent text-xs font-semibold text-[var(--accent2)] text-left">
                    &ldquo;Swalpa adjust maadi!&rdquo;
                  </p>
                  <p className="text-[11px] text-[var(--muted)] text-left mb-3">
                    ಸ್ವಲ್ಪ ಅಡ್ಜಸ್ಟ್ ಮಾಡಿ · Please adjust a bit
                  </p>

                  <div className="relative w-16 h-16 mx-auto my-2 flex items-center justify-center">
                    <div
                      className="absolute inset-0 rounded-full mic-pulse-ring"
                      style={{ backgroundColor: 'var(--accent-soft)' }}
                    />
                    <div className="relative w-12 h-12 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-md">
                      <Mic className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="mono-label text-[var(--muted)] !text-[10px] mt-1">
                    TAP THE MIC AND SPEAK
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4.4 QUOTE CARD — Signature Gradient */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="signature-gradient rounded-[28px] p-8 sm:p-12 text-white relative overflow-hidden shadow-lg">
          <div className="max-w-3xl relative z-10">
            <span
              aria-hidden="true"
              className="font-display font-bold text-6xl sm:text-7xl leading-none opacity-40 block -mb-4"
            >
              &ldquo;
            </span>
            <blockquote
              className="font-display font-bold text-2xl sm:text-4xl leading-tight"
              style={{ textWrap: 'balance' }}
            >
              Bengaluru runs on Kanglish. Now you do too.
            </blockquote>
            <div className="mt-5 flex items-center justify-between flex-wrap gap-4">
              <span className="mono-label text-white/90 !text-xs">
                — EVERY AUTO ANNA, EVER
              </span>

              {/* Hand-drawn style SVG heart doodle */}
              <svg
                width="44"
                height="40"
                viewBox="0 0 44 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="opacity-90"
                aria-hidden="true"
              >
                <path
                  d="M22.5 35.5C22.5 35.5 5 25.2 5 13.2C5 6.8 10.2 3 15.4 3C19.1 3 21.6 5.4 22.5 8.1C23.4 5.4 25.9 3 29.6 3C34.8 3 40 6.8 40 13.2C40 25.2 22.5 35.5 22.5 35.5Z"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* 4.5 HOW IT WORKS — 3 steps in 3 cards */}
      <section
        id="how-it-works"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <span className="mono-label text-[var(--accent)]">HOW IT WORKS</span>
            <h2
              className="font-display font-bold text-[var(--ink)] mt-2"
              style={{ fontSize: 'var(--text-h1)' }}
            >
              From newcomer to local in 5 minutes a day.
            </h2>
          </div>
          <p className="text-[var(--muted)] text-sm max-w-md">
            Every lesson is built around a real street conversation you will
            actually have in Bengaluru today.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: '01',
              title: 'Pick a real-life situation',
              desc: 'Start with what you need right now: hailing an Indiranagar auto, ordering Benne Dose, or talking to your landlord.',
              phrase: 'Anna, Indiranagara-kke barthira?',
              script: 'ಅಣ್ಣ, ಇಂದಿರಾನಗರಕ್ಕೆ ಬರ್ತೀರಾ?',
              tint: 'var(--tile-1)',
              stepColor: 'var(--accent)',
            },
            {
              step: '02',
              title: 'Learn 10 survival phrases with audio',
              desc: 'Tap word-bank chips to build sentences. Every phrase pairs Kannada script with clear phonetic transliteration.',
              phrase: 'Ondu by-two strong kaapi kodi.',
              script: 'ಒಂದು ಬೈ-ಟು ಸ್ಟ್ರಾಂಗ್ ಕಾಫಿ ಕೊಡಿ.',
              tint: 'var(--tile-2)',
              stepColor: 'var(--accent2)',
            },
            {
              step: '03',
              title: 'Roleplay with AI Auto Anna',
              desc: 'Step into night-mode conversation practice. Speak into your mic or pick street-smart replies to bargain like a pro.',
              phrase: 'Swalpa kammi maadi anna!',
              script: 'ಸ್ವಲ್ಪ ಕಮ್ಮಿ ಮಾಡಿ ಅಣ್ಣ!',
              tint: 'var(--tile-3)',
              stepColor: 'var(--success)',
            },
          ].map((item) => (
            <div key={item.step} className="card-surface p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <span
                    className="w-11 h-11 rounded-[14px] font-mono-accent font-semibold text-sm flex items-center justify-center"
                    style={{
                      backgroundColor: item.tint,
                      color: item.stepColor,
                    }}
                  >
                    {item.step}
                  </span>
                  <button
                    onClick={() => speakKanglishPhrase(item.phrase, item.script)}
                    className="inline-flex items-center gap-1.5 text-xs font-mono-accent text-[var(--accent)] hover:underline cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                    Hear sample
                  </button>
                </div>

                <h3 className="font-display font-semibold text-xl text-[var(--ink)] mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-[var(--muted)] leading-relaxed mb-6">
                  {item.desc}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--surface-warm)] border border-[var(--line)]">
                <p className="text-sm font-medium text-[var(--ink)]">{item.script}</p>
                <p className="translit-text text-[var(--accent2)] !text-xs mt-1">
                  &ldquo;{item.phrase}&rdquo;
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4.6 SITUATIONS BENTO — Grid of the 6 situation cards */}
      <section
        id="situations-bento"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="mono-label text-[var(--accent)]">6 REAL-LIFE SITUATIONS</span>
            <h2
              className="font-display font-bold text-[var(--ink)] mt-2"
              style={{ fontSize: 'var(--text-h1)' }}
            >
              Where do you want to speak Kannada first?
            </h2>
          </div>
          <button
            onClick={() => onEnterApp('explore')}
            className="btn-ghost !py-2.5 !px-4 !text-sm self-start sm:self-auto"
          >
            <BookOpen className="w-4 h-4 text-[var(--accent)]" />
            <span>Browse 200+ Phrasebook</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SITUATIONS.map((sit: Situation) => (
            <div
              key={sit.id}
              onClick={() => onTryLesson(sit.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onTryLesson(sit.id)}
              className="card-surface p-6 hover:border-[var(--accent)] transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div
                    className="w-13 h-13 rounded-[16px] flex items-center justify-center shrink-0"
                    style={{ backgroundColor: sit.tileTint }}
                  >
                    <MapPin className="w-6 h-6 text-[var(--accent)]" />
                  </div>
                  <span className="mono-label text-[var(--muted)]">
                    {sit.totalPhrases} PHRASES · {sit.progressPercent}%
                  </span>
                </div>

                <div className="mb-2">
                  <h3 className="font-display font-semibold text-xl text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
                    {sit.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-medium text-[var(--muted)]">
                      {sit.kannadaTitle}
                    </span>
                    <span className="text-[var(--line)]">·</span>
                    <span className="font-mono-accent text-xs text-[var(--accent2)]">
                      {sit.translitTitle}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-[var(--muted)] leading-relaxed mb-5">
                  {sit.description}
                </p>
              </div>

              <div className="space-y-3 pt-3 border-t border-[var(--line)]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono-accent text-[var(--muted)]">
                    {sit.locationTag}
                  </span>
                  <span className="font-semibold text-[var(--accent)] inline-flex items-center gap-1">
                    Start Lesson <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--surface-warm)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)] rounded-full transition-all"
                    style={{ width: `${sit.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4.7 FOOTER */}
      <footer className="mt-16 border-t border-[var(--line)] bg-[var(--surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-[var(--line)]">
            <div className="md:col-span-5 space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src="/assets/logo-icon.webp"
                  alt=""
                  width={28}
                  height={28}
                  loading="lazy"
                  draggable={false}
                  className="w-7 h-7 object-contain shrink-0 block"
                />
                <div>
                  <span className="font-headline-md text-xl text-[var(--ink)] block leading-none">
                    Kaliyona
                  </span>
                  <span className="mono-label text-[var(--muted)] !text-[10px]">
                    KANNADA, THE BENGALURU WAY
                  </span>
                </div>
              </div>
              <p className="text-sm text-[var(--muted)] max-w-sm leading-relaxed">
                Built with love for everyone moving to Bengaluru. Speak a little
                Kannada on every street corner and watch the city open up.
              </p>
            </div>

            <div className="md:col-span-3 space-y-2">
              <p className="mono-label text-[var(--ink)]">SITUATIONS</p>
              <ul className="space-y-1.5 text-sm text-[var(--muted)]">
                {SITUATIONS.slice(0, 4).map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => onTryLesson(s.id)}
                      className="hover:text-[var(--accent)] cursor-pointer"
                    >
                      {s.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-4 space-y-3">
              <p className="mono-label text-[var(--ink)]">READY TO SPEAK?</p>
              <p className="text-sm text-[var(--muted)]">
                Jump straight into Lesson 1 — no signup wall required.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={onStartOnboarding}
                  className="btn-primary !py-2.5 !px-5 !text-sm"
                >
                  Start 5-Min Onboarding
                </button>
                <button
                  onClick={() => onEnterApp('home')}
                  className="btn-ghost !py-2.5 !px-4 !text-sm"
                >
                  Dashboard
                </button>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--muted)]">
            <p>© {new Date().getFullYear()} Kaliyona Bengaluru. Made with Filter Kaapi &amp; Auto Anna wisdom.</p>
            <p className="font-mono-accent">
              ಕನ್ನಡ ಕಲಿಯೋಣ · LET&apos;S LEARN KANNADA TOGETHER
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
