let cachedVoice: SpeechSynthesisVoice | null = null;
let voiceResolved = false;

function resolveVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  if (voiceResolved && cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;
  const knVoice = voices.find((v) => v.lang.toLowerCase().startsWith('kn'));
  const enInVoice = voices.find((v) => v.lang.toLowerCase().startsWith('en-in'));
  cachedVoice = knVoice || enInVoice || voices[0] || null;
  voiceResolved = true;
  return cachedVoice;
}

export function speakKannada(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = resolveVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = 'kn-IN';
    }
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Ignore speech synthesis errors
  }
}
