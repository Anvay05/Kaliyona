# Kaliyona — Speak Kannada, Own Bengaluru

Practical spoken Kannada & Bengaluru Kanglish learning app built around real-life situations (auto rides, darshinis, PG conversations, office small talk, and street signs).

## Hybrid Online / Offline Architecture

> **Reader = Gemini Vision (online), Roleplay + Gallery + Lexicon = 100% offline.**

- **City Reader — Live Scan (Online, Gemini Vision)**:
  - Uses `@google/genai` (`gemini-3.8-flash` / `gemini-flash-latest`) via `/api/reader/scan` and client fallback (`lib/reader/gemini.ts`) to detect Kannada words/phrases, Latin transliteration, concise English meaning, and normalized `[ymin, xmin, ymax, xmax]` bounding boxes in a single shot.
  - Renders in-place, auto-fitted translations over the original photo with a `[Translate | Original]` toggle and a portaled word-practice popover (`Bol ke sunao` + `Use in Roleplay`).
  - Automatically falls back to a graceful offline notice card with direct shortcuts to **Guided Gallery** and **Roleplay** when `navigator.onLine === false`.
- **City Reader — Guided Gallery (100% Offline)**:
  - 6 real Bengaluru scenes (Darshini menus, BMTC bus board, Namma Metro signboard, Auto stand, and Street sign) with hand-verified interactive hotspots that work completely offline.
- **Talk to Anna Roleplay & Lexicon (100% Offline)**:
  - Levenshtein fuzzy matcher + curated Bengaluru Kannada/Kanglish lexicon and interactive roleplay scenarios run 100% on-device with zero network requirement.

## Local Setup & External Hosting

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local` (or set environment variables in your hosting provider such as Vercel, Netlify, or Render) with your Google AI Studio Gemini API key. Keep the server-side key private:
   ```bash
   GEMINI_API_KEY=<your_gemini_api_key>
   ```
   `VITE_GEMINI_API_KEY` is optional and intentionally exposes a key in the browser for static-host fallback; prefer `GEMINI_API_KEY` with `/api/reader/scan` when possible.
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```
