/**
 * TASK 1 — CAPABILITY DETECTION (speechSupport)
 * Classifies browser speech recognition into one of 4 states:
 * - "supported"   -> SR exists AND not blocked
 * - "iframe"      -> SR missing/errors AND window.self !== window.top
 * - "denied"      -> recognition error code is "not-allowed" or "service-not-allowed"
 * - "unsupported" -> SR truly absent (e.g. Firefox)
 *
 * Logs the detected state exactly once via console.info("[kanglish-speech]", state).
 */

export type SpeechSupportState =
  | 'supported'
  | 'iframe'
  | 'denied'
  | 'unsupported';

export type MicButtonState =
  | 'idle'
  | 'requesting-permission'
  | 'listening'
  | 'processing'
  | 'result-pass'
  | 'result-retry';

export type SpeechErrorKind = 'no-speech' | 'network' | null;

let hasLoggedInitialState = false;
let cachedSupportState: SpeechSupportState | null = null;

export function getSpeechRecognitionConstructor(): (new () => any) | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: new () => any;
    webkitSpeechRecognition?: new () => any;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

export function isRunningInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Checks if an enclosing iframe explicitly disallows the 'microphone' feature via Permissions-Policy / Feature-Policy.
 */
export function isMicBlockedByIframePolicy(): boolean {
  if (!isRunningInIframe() || typeof document === 'undefined') return false;
  try {
    const doc = document as unknown as {
      permissionsPolicy?: { allowsFeature?: (f: string) => boolean };
      featurePolicy?: { allowsFeature?: (f: string) => boolean };
    };
    const policy = doc.permissionsPolicy || doc.featurePolicy;
    if (policy && typeof policy.allowsFeature === 'function') {
      return !policy.allowsFeature('microphone');
    }
  } catch {
    // Ignore policy inspection errors
  }
  return false;
}

/**
 * Detects initial or updated speech recognition support state.
 * Logs the detected state once via console.info("[kanglish-speech]", state).
 */
export function detectSpeechSupport(
  errorCode?: string | null
): SpeechSupportState {
  const SR = getSpeechRecognitionConstructor();
  const inIframe = isRunningInIframe();

  let state: SpeechSupportState;

  if (!SR) {
    state = inIframe ? 'iframe' : 'unsupported';
  } else if (
    errorCode === 'not-allowed' ||
    errorCode === 'service-not-allowed'
  ) {
    state = isMicBlockedByIframePolicy() ? 'iframe' : 'denied';
  } else if (errorCode === 'iframe-blocked' || isMicBlockedByIframePolicy()) {
    state = 'iframe';
  } else {
    state = 'supported';
  }

  cachedSupportState = state;

  if (!hasLoggedInitialState) {
    hasLoggedInitialState = true;
    console.info('[kanglish-speech]', state);
  }

  return state;
}

export function getCurrentSpeechSupportState(): SpeechSupportState {
  if (cachedSupportState) return cachedSupportState;
  return detectSpeechSupport();
}
