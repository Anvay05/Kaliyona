# Kaliyona — Speak Kannada, Own Bengaluru

Practical spoken Kannada and Bengaluru Kanglish learning app built around real-life situations (auto rides, darshinis, PG conversations, office small talk, and street signs).

## Hybrid Online / Offline Architecture

> **Reader = Gemini Vision (online), Roleplay + Gallery + Lexicon = 100% offline.**

- **City Reader — Live Scan (Gemini + built-in OCR)**:
  - Uses `@google/genai` (`gemini-3.8-flash` / `gemini-flash-latest`) via `/api/reader/scan` when a Gemini key is configured.
  - Falls back to bundled Tesseract Kannada/English OCR, the Kaliyona lexicon, and deterministic transliteration when no Gemini key is available, so the reader still opens without setup.
  - Renders in-place, auto-fitted translations over the original photo with a `[Translate | Original]` toggle and a portaled word-practice popover (`Bol ke sunao` + `Use in Roleplay`).
  - Automatically falls back to a graceful offline notice card with direct shortcuts to **Guided Gallery** and **Roleplay** when `navigator.onLine === false`.
- **City Reader — Guided Gallery (100% Offline)**:
  - 6 real Bengaluru scenes (Darshini menus, BMTC bus board, Namma Metro signboard, Auto stand, and Street sign) with hand-verified interactive hotspots that work completely offline.
- **Talk to Anna Roleplay & Lexicon**:
  - The roleplay engine and curated Bengaluru Kannada/Kanglish lexicon run on-device. Anna uses a zero-key OpenAI-compatible endpoint by default and supports an optional custom key in Settings.

## Local Setup & External Hosting

1. Install dependencies:
   ```bash
   npm install
   ```
2. Optional: create `.env.local` (or set environment variables in your hosting provider such as Vercel, Netlify, or Render) with a Google AI Studio Gemini API key. Keep server-side keys private:
   ```bash
   GEMINI_API_KEY=<your_gemini_api_key>
   ```
   `VITE_GEMINI_API_KEY` is also supported for browser-side fallback, but it exposes the key to users. Built-in OCR works without either key.
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```
