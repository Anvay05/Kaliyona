# Kaliyona — Speak Kannada, Own Bengaluru

Practical spoken Kannada and Bengaluru Kanglish learning app built around real-life situations (auto rides, darshinis, PG conversations, office small talk, and street signs).

## Hybrid Online / Offline Architecture

> **Reader = Gemini Vision with a bundled OCR fallback; Roleplay + Gallery + Lexicon = offline-first.**

- **City Reader — Live Scan (Gemini + built-in OCR)**:
  - Uses `@google/genai` (`gemini-3.5-flash-lite`) via `/api/reader/scan` when a Gemini key is configured, with Apinex multimodal fallback (`free/gemini-3.8-flash` / `free/kimi-k3`) when `APINEX_API_KEY` or `KIMI_API_KEY` is configured.
  - Falls back to bundled Tesseract Kannada/English OCR, the Kaliyona lexicon, and deterministic transliteration when no Gemini key is available, so the reader still opens without setup.
  - Renders in-place, auto-fitted translations over the original photo with a `[Translate | Original]` toggle and a portaled word-practice popover (`Bol ke sunao` + `Use in Roleplay`).
  - Automatically falls back to a graceful offline notice card with direct shortcuts to **Guided Gallery** and **Roleplay** when `navigator.onLine === false`.
- **City Reader — Guided Gallery (100% Offline)**:
  - 6 real Bengaluru scenes (Darshini menus, BMTC bus board, Namma Metro signboard, Auto stand, and Street sign) with hand-verified interactive hotspots that work completely offline.
- **Talk to Anna Roleplay & Lexicon**:
  - The roleplay engine and curated Bengaluru Kannada/Kanglish lexicon run on-device. Anna uses the server-side Kimi K3/OpenAI-compatible provider when configured, with a browser key override available in Profile → Anna's Brain.

## Local Setup & External Hosting

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local` (or set these environment variables in your hosting provider such as Vercel, Netlify, or Render). Keep both API keys server-side:
   ```bash
   GEMINI_API_KEY=<your_gemini_api_key>
   ANNA_API_KEY=<your_kimi_k3_api_key>
   ANNA_BASE_URL=https://api.apinex.bond/v1
   ANNA_MODEL=free/kimi-k3
   APINEX_API_KEY=<your_apinex_or_kimi_key>
   APINEX_BASE_URL=https://api.apinex.bond/v1
   ```
   `KIMI_API_KEY`/`KIMI_BASE_URL`/`KIMI_MODEL` are accepted aliases. `VITE_GEMINI_API_KEY` and `VITE_ANNA_DEFAULT_KEY` are supported for local/browser fallback, but expose keys to users. Do not commit `.env` or `.env.local`; Vercel serverless functions require these values in Vercel Environment Variables. Bundled Tesseract OCR works without AI keys.
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```
