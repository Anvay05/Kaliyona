let cachedKnVoice: SpeechSynthesisVoice | null = null;
let cachedFallbackVoice: SpeechSynthesisVoice | null = null;
let voicesResolved = false;
let hasShownApproximatedNotice = false;

function resolveReaderVoice(): {
  voice: SpeechSynthesisVoice | null;
  approximated: boolean;
} {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return { voice: null, approximated: false };
  }

  if (voicesResolved && (cachedKnVoice || cachedFallbackVoice)) {
    if (cachedKnVoice) {
      return { voice: cachedKnVoice, approximated: false };
    }
    return { voice: cachedFallbackVoice, approximated: true };
  }

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) {
    return { voice: null, approximated: false };
  }

  const knExact =
    voices.find((v) => v.lang.toLowerCase() === 'kn-in') ||
    voices.find((v) => v.lang.toLowerCase().startsWith('kn')) ||
    voices.find((v) => v.name.toLowerCase().includes('kannada')) ||
    null;

  if (knExact) {
    cachedKnVoice = knExact;
    voicesResolved = true;
    return { voice: knExact, approximated: false };
  }

  const fallback =
    voices.find((v) => v.lang.toLowerCase().startsWith('hi-in')) ||
    voices.find((v) => v.lang.toLowerCase().startsWith('en-in')) ||
    voices.find((v) => v.default) ||
    voices[0] ||
    null;

  cachedFallbackVoice = fallback;
  voicesResolved = true;
  return { voice: fallback, approximated: true };
}

export interface SpeakKannadaReaderOptions {
  fallbackTranslit?: string;
  onApproximatedOnce?: () => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export function speakKannada(
  text: string,
  options?: SpeakKannadaReaderOptions
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    options?.onEnd?.();
    return;
  }

  try {
    window.speechSynthesis.cancel();

    const { voice, approximated } = resolveReaderVoice();
    const spokenText =
      approximated && options?.fallbackTranslit
        ? options.fallbackTranslit
        : text;

    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = voice?.lang || 'kn-IN';
    if (voice) {
      utterance.voice = voice;
    }
    utterance.rate = 0.92;

    if (approximated && !hasShownApproximatedNotice) {
      hasShownApproximatedNotice = true;
      options?.onApproximatedOnce?.();
    }

    utterance.onstart = () => {
      options?.onStart?.();
    };
    utterance.onend = () => {
      options?.onEnd?.();
    };
    utterance.onerror = () => {
      options?.onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  } catch {
    options?.onEnd?.();
  }
}

export function stopReaderTts(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // ignore
  }
}
