import * as React from "react"
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from "motion/react"

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface VoiceNoteProps {
  /** Real audio URL. Omit to run in simulated-playback mode using `duration`. */
  src?: string
  /** Fallback duration in seconds when `src` is omitted or before metadata loads. */
  duration?: number
  /** Controlled play state. Omit for uncontrolled. */
  playing?: boolean
  /** Fires when play state changes (both controlled & uncontrolled). */
  onPlayingChange?: (playing: boolean) => void
  /** Number of waveform bars. @default 34 */
  bars?: number
  /** Deterministic seed for the generated waveform when no `src` is analysed. @default 7 */
  seed?: number
  /** Accent color for played bars & focus ring. @default "#6C5CE7" */
  accent?: string
  /** Surface theme: 'light' (soft alabaster) or 'ink' (obsidian). @default "light" */
  variant?: "light" | "ink"
  /** Size preset. @default "md" */
  size?: "sm" | "md" | "lg"
  /** Show the 1×/1.5×/2× playback rate pill. @default true */
  showRate?: boolean
  /** Optional caption shown beneath the waveform (sender, timestamp, etc.). */
  caption?: string
  /** Extra classes on the root pill. */
  className?: string
  /** Inline style overrides on the root pill. */
  style?: React.CSSProperties
}

export interface VoiceNoteGroupProps {
  children: React.ReactNode
  className?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// COORDINATION CONTEXT — playing one note in a group pauses its siblings
// ─────────────────────────────────────────────────────────────────────────────

interface GroupCtx {
  activeId: string | null
  claim: (id: string) => void
  release: (id: string) => void
}

const VoiceNoteGroupContext = React.createContext<GroupCtx | null>(null)

export function VoiceNoteGroup({ children, className }: VoiceNoteGroupProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const claim = React.useCallback((id: string) => setActiveId(id), [])
  const release = React.useCallback(
    (id: string) => setActiveId((cur) => (cur === id ? null : cur)),
    []
  )
  const value = React.useMemo(
    () => ({ activeId, claim, release }),
    [activeId, claim, release]
  )
  return (
    <VoiceNoteGroupContext.Provider value={value}>
      <div className={className}>{children}</div>
    </VoiceNoteGroupContext.Provider>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

const RATES = [1, 1.5, 2] as const
type Rate = (typeof RATES)[number]

const SIZE_MAP = {
  sm: {
    pillH: 48,
    padX: 8,
    btn: 34,
    barH: 22,
    barW: 2.5,
    barGap: 2.5,
    fontSize: 11.5,
    rateH: 22,
  },
  md: {
    pillH: 58,
    padX: 11,
    btn: 40,
    barH: 28,
    barW: 3,
    barGap: 3,
    fontSize: 12.5,
    rateH: 24,
  },
  lg: {
    pillH: 68,
    padX: 14,
    btn: 46,
    barH: 34,
    barW: 3.5,
    barGap: 3.5,
    fontSize: 13.5,
    rateH: 26,
  },
} as const

/** Deterministic speech-envelope waveform (syllable bursts + breath pauses). */
function generateSpeechPeaks(count: number, seed: number): number[] {
  let s = (seed * 9301 + 49297) % 233280
  const rand = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1)
    const fade = Math.sin(t * Math.PI)
    const syllable =
      0.55 +
      0.35 * Math.sin(t * Math.PI * 5.5 + seed) +
      0.25 * Math.cos(t * Math.PI * 11.3 - seed * 0.7)
    const pause = Math.sin(t * Math.PI * 3.2 + seed * 1.3) < -0.55 ? 0.28 : 1
    const jitter = 0.75 + rand() * 0.5
    const v = Math.max(
      0.16,
      Math.min(1, fade * syllable * pause * jitter * 0.85 + 0.12)
    )
    out.push(Number(v.toFixed(3)))
  }
  return out
}

function formatTime(sec: number): { mm: string; s1: string; s2: string } {
  const clamped = Math.max(0, Math.floor(Number.isFinite(sec) ? sec : 0))
  const m = Math.floor(clamped / 60)
  const s = clamped % 60
  return {
    mm: String(m),
    s1: String(Math.floor(s / 10)),
    s2: String(s % 10),
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "")
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean
  const num = parseInt(full, 16)
  if (Number.isNaN(num)) return `rgba(29, 99, 255, ${alpha})`
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// ─────────────────────────────────────────────────────────────────────────────
// SCOPED CSS — registered @property for the conic-gradient border orbit
// ─────────────────────────────────────────────────────────────────────────────

const STYLE_ID = "vn-aurora-keyframes-v1"

const AURORA_CSS = `
@property --vn-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}
@keyframes vn-orbit {
  to { --vn-angle: 360deg; }
}
.vn-aurora-ring {
  animation: vn-orbit 4.6s linear infinite;
}
.vn-aurora-wash {
  animation: vn-orbit 6.4s linear infinite reverse;
}
`

function useAuroraStyleInjection() {
  React.useEffect(() => {
    if (typeof document === "undefined") return
    if (document.getElementById(STYLE_ID)) return
    const tag = document.createElement("style")
    tag.id = STYLE_ID
    tag.textContent = AURORA_CSS
    document.head.appendChild(tag)
  }, [])
}

// ─────────────────────────────────────────────────────────────────────────────
// ROLLING DIGIT — vertical spring odometer for time readout
// ─────────────────────────────────────────────────────────────────────────────

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]

const RollingDigit = React.memo(function RollingDigit({
  digit,
  height,
}: {
  digit: string
  height: number
}) {
  const idx = Math.max(0, DIGITS.indexOf(digit))
  return (
    <span
      style={{
        display: "inline-block",
        height,
        overflow: "hidden",
        verticalAlign: "bottom",
        position: "relative",
        width: "0.62em",
      }}
    >
      <motion.span
        animate={{ y: -idx * height }}
        transition={{
          type: "spring",
          stiffness: 420,
          damping: 32,
          mass: 0.6,
        }}
        style={{
          display: "flex",
          flexDirection: "column",
          willChange: "transform",
        }}
      >
        {DIGITS.map((d) => (
          <span
            key={d}
            style={{
              height,
              lineHeight: `${height}px`,
              display: "block",
              textAlign: "center",
            }}
          >
            {d}
          </span>
        ))}
      </motion.span>
    </span>
  )
})

// ─────────────────────────────────────────────────────────────────────────────
// PLAY / PAUSE MORPH ICON — two vertical bars that fuse into a play triangle
// ─────────────────────────────────────────────────────────────────────────────

function TransportGlyph({
  playing,
  color,
  size,
}: {
  playing: boolean
  color: string
  size: number
}) {
  const spring = {
    type: "spring" as const,
    stiffness: 520,
    damping: 30,
    mass: 0.55,
  }
  const leftPoints = playing
    ? "5.5,4.5 9.2,4.5 9.2,19.5 5.5,19.5"
    : "6.5,4.2 12.6,8.1 12.6,15.9 6.5,19.8"
  const rightPoints = playing
    ? "14.8,4.5 18.5,4.5 18.5,19.5 14.8,19.5"
    : "12.2,7.9 19.4,12 19.4,12 12.2,16.1"

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      animate={{ rotate: playing ? 0 : 0, scale: playing ? 1 : 1 }}
      transition={spring}
      style={{ display: "block", overflow: "visible" }}
    >
      <motion.polygon
        points={leftPoints}
        fill={color}
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
        animate={{ points: leftPoints }}
        transition={spring}
      />
      <motion.polygon
        points={rightPoints}
        fill={color}
        stroke={color}
        strokeWidth="1.6"
        strokeLinejoin="round"
        animate={{ points: rightPoints }}
        transition={spring}
      />
    </motion.svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function VoiceNote({
  src,
  duration: durationProp = 18,
  playing: playingProp,
  onPlayingChange,
  bars = 34,
  seed = 7,
  accent = "#6C5CE7",
  variant = "light",
  size = "md",
  showRate = true,
  caption,
  className,
  style,
}: VoiceNoteProps) {
  useAuroraStyleInjection()

  const id = React.useId()
  const group = React.useContext(VoiceNoteGroupContext)
  const dims = SIZE_MAP[size]
  const isInk = variant === "ink"

  // ── Play state (controlled OR uncontrolled) ────────────────────────────────
  const isControlled = playingProp !== undefined
  const [internalPlaying, setInternalPlaying] = React.useState(false)
  const playing = isControlled ? Boolean(playingProp) : internalPlaying

  const setPlaying = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalPlaying(next)
      onPlayingChange?.(next)
      if (group) {
        if (next) group.claim(id)
        else group.release(id)
      }
    },
    [isControlled, onPlayingChange, group, id]
  )

  // Pause when a sibling in the same <VoiceNoteGroup> starts playing
  React.useEffect(() => {
    if (group && group.activeId && group.activeId !== id && playing) {
      if (!isControlled) setInternalPlaying(false)
      onPlayingChange?.(false)
    }
  }, [group, group?.activeId, id, playing, isControlled, onPlayingChange])

  // ── Playback rate & duration ───────────────────────────────────────────────
  const [rateIndex, setRateIndex] = React.useState(0)
  const rate: Rate = RATES[rateIndex]
  const [duration, setDuration] = React.useState(durationProp)
  const [elapsed, setElapsed] = React.useState(0)
  const [scrubbing, setScrubbing] = React.useState(false)
  const [hoverRatio, setHoverRatio] = React.useState<number | null>(null)

  React.useEffect(() => {
    setDuration(durationProp)
  }, [durationProp])

  // ── Continuous progress motion value (0..1) ────────────────────────────────
  const progressMV = useMotionValue(0)
  const smoothProgress = useSpring(progressMV, {
    stiffness: 340,
    damping: 36,
    mass: 0.35,
  })
  const auroraScale = useSpring(playing ? 1 : 0, {
    stiffness: 210,
    damping: 26,
    mass: 0.7,
  })
  React.useEffect(() => {
    auroraScale.set(playing ? 1 : 0)
  }, [playing, auroraScale])

  // Track user-initiated pause vs natural playback completion
  const userPausedRef = React.useRef(false)
  const prevPlayingRef = React.useRef(playing)

  React.useEffect(() => {
    const wasPlaying = prevPlayingRef.current
    prevPlayingRef.current = playing

    if (!wasPlaying && playing) {
      // Starting playback: if at the end or fresh start, jump cleanly to 0
      if (progressMV.get() >= 0.92 || !userPausedRef.current) {
        progressMV.jump(0)
        smoothProgress.jump(0)
        lastSecondRef.current = 0
        setElapsed(0)
      }
      userPausedRef.current = false
    } else if (wasPlaying && !playing) {
      // Playback stopped: if not manually paused by user, complete smoothly to 100%
      if (!userPausedRef.current) {
        progressMV.set(1)
        lastSecondRef.current = Math.ceil(duration)
        setElapsed(duration)
      }
      userPausedRef.current = false
    }
  }, [playing, duration, progressMV, smoothProgress])

  // ── Waveform peaks (decoded from src when possible, else speech envelope) ──
  const [peaks, setPeaks] = React.useState<number[]>(() =>
    generateSpeechPeaks(bars, seed)
  )
  React.useEffect(() => {
    setPeaks(generateSpeechPeaks(bars, seed))
  }, [bars, seed])

  // Optional real <audio> element + Web Audio frequency sampler
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const liveLevelsRef = React.useRef<Float32Array | null>(null)
  const analyserRef = React.useRef<AnalyserNode | null>(null)

  React.useEffect(() => {
    if (!src || typeof window === "undefined") return
    const audio = new Audio()
    audio.crossOrigin = "anonymous"
    audio.preload = "metadata"
    audio.src = src
    audioRef.current = audio

    const onLoaded = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration)
      }
    }
    const onEnded = () => {
      userPausedRef.current = false
      progressMV.set(1)
      setElapsed(audio.duration || duration)
      setPlaying(false)
    }
    audio.addEventListener("loadedmetadata", onLoaded)
    audio.addEventListener("ended", onEnded)

    // Decode full buffer once to extract true waveform peaks (best-effort; CORS-safe fallback)
    let cancelled = false
    fetch(src)
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext
        if (!Ctx) return
        const ctx = new Ctx()
        return ctx.decodeAudioData(buf).then((decoded) => {
          if (cancelled) return
          const ch = decoded.getChannelData(0)
          const bucket = Math.floor(ch.length / bars)
          const sampled: number[] = []
          let max = 0.001
          for (let i = 0; i < bars; i++) {
            let sum = 0
            const start = i * bucket
            for (let j = 0; j < bucket; j++) sum += Math.abs(ch[start + j] || 0)
            const avg = sum / Math.max(1, bucket)
            sampled.push(avg)
            if (avg > max) max = avg
          }
          setPeaks(
            sampled.map((v) =>
              Number(Math.max(0.16, Math.min(1, (v / max) * 0.92 + 0.08)).toFixed(3))
            )
          )
          ctx.close().catch(() => {})
        })
      })
      .catch(() => {
        /* keep deterministic speech envelope on CORS / decode failure */
      })

    return () => {
      cancelled = true
      audio.pause()
      audio.removeEventListener("loadedmetadata", onLoaded)
      audio.removeEventListener("ended", onEnded)
      audioRef.current = null
    }
  }, [src, bars, duration, progressMV, setPlaying])

  // Sync rate to real audio element
  React.useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate
  }, [rate])

  // ── 120fps-clean rAF clock (drives both simulated & real playback + live bar dance)
  const barRefs = React.useRef<(HTMLSpanElement | null)[]>([])
  const lastSecondRef = React.useRef<number>(-1)

  React.useEffect(() => {
    if (!playing && !scrubbing) {
      // Settle bars back to their static peak heights
      for (let i = 0; i < peaks.length; i++) {
        const el = barRefs.current[i]
        if (!el) continue
        el.style.transform = `scaleY(${peaks[i]})`
      }
      return
    }

    let raf = 0
    let lastTs = performance.now()
    const audio = audioRef.current

    if (audio && playing) {
      const startRatio = progressMV.get() >= 0.95 ? 0 : progressMV.get()
      audio.currentTime = startRatio * (audio.duration || duration)
      audio.playbackRate = rate
      audio.play().catch(() => {
        /* fall back to simulated clock if autoplay blocked */
      })
    }

    const tick = (now: number) => {
      const dt = Math.min(0.064, (now - lastTs) / 1000)
      lastTs = now

      let p = progressMV.get()
      if (playing && !scrubbing) {
        if (audio && !audio.paused && Number.isFinite(audio.duration) && audio.duration > 0) {
          p = audio.currentTime / audio.duration
        } else {
          p = p + (dt * rate) / Math.max(0.5, duration)
        }
        if (p >= 1) {
          p = 1
          progressMV.set(1)
          lastSecondRef.current = Math.ceil(duration)
          setElapsed(duration)
          if (!isControlled) {
            userPausedRef.current = false
            setPlaying(false)
            return
          }
        } else {
          progressMV.set(p)
        }
      }

      const secNow = Math.floor(p * duration)
      if (secNow !== lastSecondRef.current) {
        lastSecondRef.current = secNow
        setElapsed(p * duration)
      }

      // Sample analyser if connected
      const analyser = analyserRef.current
      const buf = liveLevelsRef.current
      if (analyser && buf) {
        analyser.getByteFrequencyData(buf as unknown as Uint8Array<ArrayBuffer>)
      }

      // Direct DOM transform update on each bar — zero React re-render per frame
      const t = now * 0.001 * (0.85 + rate * 0.25)
      const headIdx = p * (peaks.length - 1)
      for (let i = 0; i < peaks.length; i++) {
        const el = barRefs.current[i]
        if (!el) continue
        const base = peaks[i]
        const distFromHead = Math.abs(i - headIdx)
        const headBoost = Math.max(0, 1 - distFromHead / 3.2) * 0.26
        const wave =
          playing && !scrubbing
            ? Math.sin(t * 7.5 + i * 0.65) * 0.11 +
              Math.cos(t * 12.3 - i * 0.4) * 0.08 +
              headBoost
            : headBoost * 0.6
        const scale = Math.max(0.14, Math.min(1.06, base + wave))
        el.style.transform = `scaleY(${scale.toFixed(3)})`
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      if (audio && !audio.paused) audio.pause()
    }
  }, [playing, scrubbing, duration, rate, peaks, progressMV, setPlaying, isControlled])

  // ── Scrubbing handlers on the waveform track ───────────────────────────────
  const trackRef = React.useRef<HTMLDivElement | null>(null)

  const seekFromClientX = React.useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect()
      if (!rect || rect.width <= 0) return
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      progressMV.set(ratio)
      const nextSec = ratio * duration
      lastSecondRef.current = Math.floor(nextSec)
      setElapsed(nextSec)
      if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
        audioRef.current.currentTime = ratio * audioRef.current.duration
      }
    },
    [duration, progressMV]
  )

  const onPointerDownTrack = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setScrubbing(true)
    seekFromClientX(e.clientX)
  }
  const onPointerMoveTrack = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (rect && rect.width > 0) {
      setHoverRatio(
        Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      )
    }
    if (scrubbing) seekFromClientX(e.clientX)
  }
  const onPointerUpTrack = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    setScrubbing(false)
  }

  // Keyboard accessibility on the waveform slider
  const onKeyDownRoot = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault()
      if (playing) {
        userPausedRef.current = true
        setPlaying(false)
      } else {
        userPausedRef.current = false
        if (progressMV.get() >= 0.92) {
          progressMV.jump(0)
          smoothProgress.jump(0)
          setElapsed(0)
        }
        setPlaying(true)
      }
    } else if (e.key === "ArrowRight") {
      e.preventDefault()
      const next = Math.min(1, progressMV.get() + 0.05)
      progressMV.set(next)
      setElapsed(next * duration)
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      const next = Math.max(0, progressMV.get() - 0.05)
      progressMV.set(next)
      setElapsed(next * duration)
    }
  }

  const cycleRate = (e: React.MouseEvent) => {
    e.stopPropagation()
    setRateIndex((i) => (i + 1) % RATES.length)
  }

  // ── Derived clip-path for the played layer ─────────────────────────────────
  const clipRight = useTransform(smoothProgress, (v) => {
    if (v >= 0.985) return "inset(-6px -2px -6px -6px)"
    const pct = Math.max(0, Math.min(100, (1 - v) * 100))
    return `inset(-6px ${pct.toFixed(2)}% -6px -6px)`
  })
  const playheadLeft = useTransform(smoothProgress, (v) => `${(Math.min(1, v) * 100).toFixed(2)}%`)
  const auroraOpacity = useTransform(auroraScale, [0, 1], [0, 0.5])

  // Time display: show remaining while idle at 0, elapsed once started
  const shownSeconds =
    playing || elapsed > 0.05 ? elapsed : duration
  const timeParts = formatTime(shownSeconds)
  const digitH = Math.round(dims.fontSize * 1.25)

  // Palette tokens — clean, bright, zero dark/muddy shadows
  const surfaceBg = isInk
    ? "linear-gradient(180deg, #151924 0%, #0E1118 100%)"
    : "linear-gradient(180deg, #FFFFFF 0%, #F8FAFF 100%)"
  const surfaceBorder = isInk
    ? "rgba(255, 255, 255, 0.09)"
    : "rgba(99, 102, 241, 0.16)"
  const unplayedBar = isInk
    ? "rgba(255, 255, 255, 0.22)"
    : "rgba(100, 116, 139, 0.22)"
  const textPrimary = isInk ? "#F1F5F9" : "#1E293B"
  const textMuted = isInk ? "rgba(241, 245, 249, 0.58)" : "rgba(71, 85, 105, 0.72)"
  const btnIdleBg = isInk ? "#F8FAFC" : accent
  const btnIdleFg = isInk ? "#0F172A" : "#FFFFFF"

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        gap: 6,
        maxWidth: "100%",
        userSelect: "none",
        WebkitUserSelect: "none",
        ...style,
      }}
    >
      {/* ── OUTER SHELL (hosts the soft pastel glow + pill surface) ── */}
      <motion.div
        role="group"
        aria-label="Voice note player"
        tabIndex={0}
        onKeyDown={onKeyDownRoot}
        whileHover={{ y: -0.5 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          height: dims.pillH,
          paddingLeft: dims.padX,
          paddingRight: dims.padX + 4,
          gap: dims.padX,
          borderRadius: 9999,
          background: surfaceBg,
          boxShadow: isInk
            ? "0 1px 0 rgba(255,255,255,0.07) inset, 0 8px 20px -8px rgba(2, 6, 23, 0.45)"
            : "0 1px 0 rgba(255,255,255,0.98) inset, 0 3px 10px -2px rgba(99, 102, 241, 0.08), 0 1px 3px rgba(15, 23, 42, 0.03)",
          border: `1px solid ${surfaceBorder}`,
          outline: "none",
          isolation: "isolate",
        }}
      >
        {/* ── SOFT AIRY GLOW (subtle pastel bloom while playing) ──────── */}
        {/* Layer 1: Gentle pastel halo behind the pill */}
        <motion.div
          aria-hidden
          className="vn-aurora-wash"
          style={{
            position: "absolute",
            inset: -3,
            borderRadius: 9999,
            pointerEvents: "none",
            zIndex: -2,
            opacity: auroraOpacity,
            filter: "blur(8px)",
            background:
              "conic-gradient(from var(--vn-angle), rgba(147, 197, 253, 0.25), rgba(165, 180, 252, 0.28), rgba(125, 211, 252, 0.25), rgba(196, 181, 253, 0.25), rgba(147, 197, 253, 0.25))",
          }}
        />

        {/* Layer 2: Soft sky/periwinkle perimeter ring */}
        <motion.div
          aria-hidden
          className="vn-aurora-ring"
          style={{
            position: "absolute",
            inset: -1,
            borderRadius: 9999,
            padding: 1,
            pointerEvents: "none",
            zIndex: -1,
            opacity: auroraOpacity,
            background:
              "conic-gradient(from var(--vn-angle), #93C5FD 0deg, #60A5FA 90deg, #38BDF8 180deg, #818CF8 270deg, #93C5FD 360deg)",
            WebkitMask:
              "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
        />

        {/* Layer 3: Subtle interior pastel sheen */}
        <motion.div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 9999,
            pointerEvents: "none",
            opacity: auroraOpacity,
            background: isInk
              ? "radial-gradient(120% 90% at 18% 50%, rgba(56, 189, 248, 0.12) 0%, transparent 75%)"
              : "radial-gradient(120% 90% at 18% 50%, rgba(96, 165, 250, 0.07) 0%, rgba(56, 189, 248, 0.03) 48%, transparent 78%)",
          }}
        />

        {/* ── PLAY / PAUSE TRANSPORT BUTTON ────────────────────────────── */}
        <motion.button
          type="button"
          aria-label={playing ? "Pause voice note" : "Play voice note"}
          aria-pressed={playing}
          onClick={(e) => {
            e.stopPropagation()
            if (playing) {
              userPausedRef.current = true
              setPlaying(false)
            } else {
              userPausedRef.current = false
              if (progressMV.get() >= 0.92) {
                progressMV.jump(0)
                smoothProgress.jump(0)
                lastSecondRef.current = 0
                setElapsed(0)
              }
              setPlaying(true)
            }
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.91 }}
          animate={{
            backgroundColor: playing ? accent : btnIdleBg,
            boxShadow: playing
              ? `0 3px 10px -2px ${hexToRgba(accent, 0.35)}, 0 0 0 2.5px ${hexToRgba(accent, 0.14)}`
              : isInk
                ? "0 2px 8px -2px rgba(0,0,0,0.35)"
                : `0 2px 6px -1px ${hexToRgba(accent, 0.22)}`,
          }}
          transition={{
            type: "spring",
            stiffness: 460,
            damping: 28,
          }}
          style={{
            position: "relative",
            width: dims.btn,
            height: dims.btn,
            borderRadius: 9999,
            border: "none",
            padding: 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            outline: "none",
          }}
        >
          <TransportGlyph
            playing={playing}
            color={playing ? "#FFFFFF" : btnIdleFg}
            size={Math.round(dims.btn * 0.46)}
          />
        </motion.button>

        {/* ── INTERACTIVE WAVEFORM SCRUBBER ────────────────────────────── */}
        <div
          ref={trackRef}
          role="slider"
          aria-label="Voice note progress"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(elapsed)}
          onPointerDown={onPointerDownTrack}
          onPointerMove={onPointerMoveTrack}
          onPointerUp={onPointerUpTrack}
          onPointerCancel={onPointerUpTrack}
          onPointerLeave={() => setHoverRatio(null)}
          style={{
            position: "relative",
            height: dims.barH + 8,
            display: "inline-flex",
            alignItems: "center",
            cursor: "pointer",
            touchAction: "none",
            paddingTop: 4,
            paddingBottom: 4,
          }}
        >
          {/* Base (unplayed) waveform bars */}
          <div
            aria-hidden
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: dims.barH,
              gap: dims.barGap,
            }}
          >
            {peaks.map((peak, i) => {
              const hovered =
                hoverRatio !== null && i / peaks.length <= hoverRatio
              return (
                <span
                  key={i}
                  ref={(el) => {
                    barRefs.current[i] = el
                  }}
                  style={{
                    width: dims.barW,
                    height: dims.barH,
                    borderRadius: 999,
                    background: hovered
                      ? hexToRgba(accent, isInk ? 0.42 : 0.34)
                      : unplayedBar,
                    transform: `scaleY(${peak})`,
                    transformOrigin: "50% 50%",
                    transition:
                      "background-color 140ms ease, transform 90ms linear",
                    willChange: "transform",
                    display: "inline-block",
                  }}
                />
              )
            })}
          </div>

          {/* Clipped played overlay — mirrors live bar transforms via shared CSS variables */}
          <motion.div
            aria-hidden
            style={{
              position: "absolute",
              inset: "4px 0",
              display: "inline-flex",
              alignItems: "center",
              height: dims.barH,
              gap: dims.barGap,
              clipPath: clipRight,
              pointerEvents: "none",
            }}
          >
            {peaks.map((peak, i) => (
              <PlayedBarMirror
                key={i}
                index={i}
                sourceRefs={barRefs}
                playing={playing || scrubbing}
                peak={peak}
                width={dims.barW}
                height={dims.barH}
                accent={accent}
              />
            ))}
          </motion.div>

          {/* Luminous playhead bead (visible while playing or scrubbing) */}
          <motion.span
            aria-hidden
            animate={{
              opacity: playing || scrubbing ? 1 : 0,
              scaleY: scrubbing ? 1.15 : 1,
            }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            style={{
              position: "absolute",
              top: 2,
              bottom: 2,
              left: playheadLeft,
              width: 2,
              marginLeft: -1,
              borderRadius: 999,
              background: accent,
              boxShadow: `0 0 6px 1px ${hexToRgba(accent, 0.35)}`,
              pointerEvents: "none",
            }}
          />
        </div>

        {/* ── ROLLING MONOSPACE TIME READOUT ───────────────────────────── */}
        <div
          aria-live="off"
          style={{
            display: "inline-flex",
            alignItems: "center",
            fontFamily:
              'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
            fontVariantNumeric: "tabular-nums",
            fontSize: dims.fontSize,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: playing ? textPrimary : textMuted,
            lineHeight: `${digitH}px`,
            height: digitH,
            minWidth: 34,
            justifyContent: "flex-end",
            transition: "color 180ms ease",
          }}
        >
          <RollingDigit digit={timeParts.mm} height={digitH} />
          <span
            style={{
              display: "inline-block",
              padding: "0 1px",
              opacity: 0.65,
              transform: "translateY(-0.5px)",
            }}
          >
            :
          </span>
          <RollingDigit digit={timeParts.s1} height={digitH} />
          <RollingDigit digit={timeParts.s2} height={digitH} />
        </div>

        {/* ── PLAYBACK RATE CYCLER (1× / 1.5× / 2×) ────────────────────── */}
        {showRate && (
          <motion.button
            type="button"
            aria-label={`Playback speed ${rate}x, click to change`}
            onClick={cycleRate}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 500, damping: 28 }}
            style={{
              height: dims.rateH,
              minWidth: 34,
              padding: "0 7px",
              borderRadius: 9999,
              border: `1px solid ${
                rate !== 1
                  ? hexToRgba(accent, isInk ? 0.55 : 0.4)
                  : surfaceBorder
              }`,
              background:
                rate !== 1
                  ? hexToRgba(accent, isInk ? 0.22 : 0.12)
                  : isInk
                    ? "rgba(255, 255, 255, 0.06)"
                    : "rgba(99, 102, 241, 0.06)",
              color: rate !== 1 ? (isInk ? "#93C5FD" : accent) : textPrimary,
              fontFamily:
                'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
              fontSize: dims.fontSize - 1.5,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              position: "relative",
              flexShrink: 0,
            }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={rate}
                initial={{ y: 9, opacity: 0, filter: "blur(2px)" }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                exit={{ y: -9, opacity: 0, filter: "blur(2px)" }}
                transition={{
                  type: "spring",
                  stiffness: 520,
                  damping: 30,
                  mass: 0.5,
                }}
                style={{ display: "inline-block", lineHeight: 1 }}
              >
                {rate}×
              </motion.span>
            </AnimatePresence>
          </motion.button>
        )}
      </motion.div>

      {/* Optional subtle caption row */}
      {caption && (
        <div
          style={{
            paddingLeft: dims.padX + 2,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.01em",
            color: textMuted,
          }}
        >
          {caption}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYED-BAR MIRROR — stays locked to the unplayed bar's live rAF scaleY
// ─────────────────────────────────────────────────────────────────────────────

function PlayedBarMirror({
  index,
  sourceRefs,
  playing,
  peak,
  width,
  height,
  accent,
}: {
  index: number
  sourceRefs: React.MutableRefObject<(HTMLSpanElement | null)[]>
  playing: boolean
  peak: number
  width: number
  height: number
  accent: string
}) {
  const ref = React.useRef<HTMLSpanElement | null>(null)

  React.useEffect(() => {
    if (!playing) {
      if (ref.current) ref.current.style.transform = `scaleY(${peak})`
      return
    }
    let raf = 0
    const sync = () => {
      const src = sourceRefs.current[index]
      if (src && ref.current) {
        ref.current.style.transform = src.style.transform || `scaleY(${peak})`
      }
      raf = requestAnimationFrame(sync)
    }
    raf = requestAnimationFrame(sync)
    return () => cancelAnimationFrame(raf)
  }, [playing, index, peak, sourceRefs])

  return (
    <span
      ref={ref}
      style={{
        width,
        height,
        borderRadius: 999,
        background: `linear-gradient(180deg, #60A5FA 0%, ${accent} 100%)`,
        transform: `scaleY(${peak})`,
        transformOrigin: "50% 50%",
        willChange: "transform",
        display: "inline-block",
      }}
    />
  )
}

export default VoiceNote
