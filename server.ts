import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import {
  GoogleGenAI,
  Modality,
  Type,
  LiveServerMessage,
  ThinkingLevel,
} from '@google/genai';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function isPlaceholderKey(val?: string): boolean {
  if (!val) return true;
  const trimmed = val.trim();
  return (
    !trimmed ||
    trimmed === 'PASTE_KEY_HERE' ||
    trimmed === 'MY_GEMINI_API_KEY' ||
    trimmed === '<key>' ||
    trimmed === 'YOUR_API_KEY'
  );
}

function getGenAIClient(overrideKey?: string): GoogleGenAI | null {
  const candidates = [
    overrideKey,
    process.env.GEMINI_API_KEY,
    process.env.VITE_GEMINI_API_KEY,
  ];
  const rawKey = candidates.find((k) => !isPlaceholderKey(k))?.trim() || '';

  if (!rawKey) {
    return null;
  }

  return new GoogleGenAI({
    apiKey: rawKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function resolveBrainModel(requestedModel?: string): string {
  if (!requestedModel) return 'gemini-3-flash-preview';
  const normalized = requestedModel.trim().toLowerCase();
  if (
    normalized === 'gemini-3-flash-preview' ||
    normalized === 'gemini-3.8-flash' ||
    normalized === 'gemini-3.5-flash' ||
    normalized === 'gemini-flash' ||
    normalized === 'gemini-flash-latest'
  ) {
    return 'gemini-3-flash-preview';
  }
  if (normalized === 'gemini-lite' || normalized === 'flash-lite' || normalized === 'gemini-3.1-flash-lite') {
    return 'gemini-3.1-flash-lite-preview';
  }
  return requestedModel;
}

function getThinkingConfigForModel(modelName: string) {
  if (modelName.includes('3.1-flash-lite')) {
    return { thinkingLevel: ThinkingLevel.MINIMAL };
  }
  if (modelName.includes('3-flash')) {
    return { thinkingLevel: ThinkingLevel.LOW };
  }
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateContentWithFallback(
  ai: GoogleGenAI,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any,
  requireNonEmptyArray = false
) {
  const primaryModel = resolveBrainModel(params.model);
  const fallbackChain = requireNonEmptyArray
    ? ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-3.1-flash-lite-preview']
    : [
        primaryModel,
        'gemini-3-flash-preview',
        'gemini-2.5-flash',
        'gemini-3.1-flash-lite-preview',
      ].filter((m, idx, arr) => Boolean(m) && arr.indexOf(m) === idx);

  const callSingleModel = async (candidateModel: string, delayMs = 0) => {
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
    const thinkingConfig = getThinkingConfigForModel(candidateModel);
    const res = await ai.models.generateContent({
      ...params,
      model: candidateModel,
      config: {
        ...params.config,
        ...(thinkingConfig ? { thinkingConfig } : {}),
      },
    });
    const text = (res.text || '').trim();
    if (!text) {
      throw new Error(`Empty response from ${candidateModel}`);
    }
    if (requireNonEmptyArray) {
      const start = text.indexOf('[');
      const end = text.lastIndexOf(']');
      if (start === -1 || end === -1 || end <= start) {
        throw new Error(`Non-array response from ${candidateModel}`);
      }
      const parsed = JSON.parse(text.slice(start, end + 1));
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error(`Empty array [] from ${candidateModel}`);
      }
    }
    return res;
  };

  // Run primary fast model first, and hedge with fallback if primary takes >3.5s or fails
  try {
    return await Promise.any(
      fallbackChain.map((candidateModel, idx) =>
        callSingleModel(candidateModel, idx * 3500)
      )
    );
  } catch (err: unknown) {
    if (err instanceof AggregateError && err.errors.length > 0) {
      // If all models returned empty array [], return a synthetic empty array response
      const allEmptyArray = err.errors.every(
        (e) => e instanceof Error && e.message.startsWith('Empty array []')
      );
      if (allEmptyArray) {
        return { text: '[]' };
      }
      throw err.errors[0];
    }
    throw err;
  }
}

const ANNA_SYSTEM_PROMPT = `You are Anna, the friendly Kannada teacher and Bengaluru roleplay companion in the Kaliyona app.

## TEACHING LEVEL — BEGINNER ONLY (STRICT)
- The Kannada phrase you teach must be SHORT: maximum 5-7 words — something a learner can repeat after hearing it ONCE
- If the situation needs a long sentence, teach ONLY the short core phrase — never dump a full complex sentence
- Use the most common everyday spoken version — no bookish words, no complex grammar, no rare vocabulary
- Never add filler like "sir", "yaavagaalu", honorifics unless the user specifically asks about politeness levels
- Teach ONE phrase per reply — never two phrases at once
- After the phrase, in the explanation give quick word-by-word meaning so the learner can build it themselves

## REPLY FORMAT — TWO-PART (STRICT)
Every teaching reply follows this exact structure:
- Part 1 (Kannada line -> "kanglish" & "script"): ONLY the pure Kannada phrase (max 5-7 words). Never mix English/Hindi explanation into "kanglish".
- Part 2 (Explanation -> "english"): Explain in the SAME language the user wrote in (Hindi/Hinglish/English/Kannada) — meaning, quick word-by-word breakdown, and when to say it. Keep Anna's friendly Bangalore-buddy tone.

Example for "hotel mein bill mangana hai":
- kanglish: "Bill kodi"
- script: "ಬಿಲ್ ಕೊಡಿ"
- english: "Matlab \\"bill do\\" — 'kodi' = do. Hotel mein haath utha ke seedha bol do, sab samajh jaate hai. 😄"

Example for "how do I order coffee":
- kanglish: "Ondu coffee kodi"
- script: "ಒಂದು ಕಾಫಿ ಕೊಡಿ"
- english: "Means \\"give me one coffee\\" — 'ondu' = one, 'kodi' = give. Works for anything: ondu tea kodi, ondu dosa kodi."

Example for "auto wala extra maang raha hai":
- kanglish: "Metre mele hattu jasti"
- script: "ಮೀಟರ್ ಮೇಲೆ ಹತ್ತು ಜಾಸ್ತಿ"
- english: "Matlab \\"meter pe dus extra\\" — 'metre mele' = on the meter, 'hattu jasti' = ten extra. Auto wale ko seedha bol do. 😄"

CRITICAL RULES:
1. Kannada line ("kanglish" + "script") = pure Kannada phrase only (max 5-7 words), never mix English/Hindi explanation into it.
2. Explanation ("english") = fully in the user's language, with overall meaning + quick word-by-word breakdown + when to say it.
3. Always reply in STRICT JSON:
   {"kanglish": "...", "script": "...", "english": "...", "correction": "..." | null, "mood": "happy" | "neutral" | "excited" | "thinking"}`;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // =========================================================================
  // POST /api/reader/scan — City Reader Gemini Vision Endpoint (gemini-3.8-flash)
  // =========================================================================
  app.post('/api/reader/scan', async (req, res) => {
    try {
      const { imageBase64, prompt, model, clientApiKey } = req.body || {};
      if (!imageBase64 || typeof imageBase64 !== 'string') {
        res.status(400).json({ error: 'Missing imageBase64' });
        return;
      }

      const ai = getGenAIClient(clientApiKey);
      if (!ai) {
        res.status(503).json({ error: 'Gemini API key not configured' });
        return;
      }

      const response = await generateContentWithFallback(
        ai,
        {
          model: resolveBrainModel(model || 'gemini-3.8-flash'),
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: imageBase64,
                  },
                },
                {
                  text:
                    typeof prompt === 'string' && prompt.trim()
                      ? prompt
                      : 'Find every distinct Kannada word, line, or short phrase in this image (including signs, bus boards, menus, banners, and news/meme captions) and return a JSON array of {kn, translit, en, box: [ymin, xmin, ymax, xmax]}.',
                },
              ],
            },
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  kn: {
                    type: Type.STRING,
                    description: 'Exact Kannada script text as written.',
                  },
                  translit: {
                    type: Type.STRING,
                    description: 'Simple Latin/English transliteration.',
                  },
                  en: {
                    type: Type.STRING,
                    description: 'Concise English translation.',
                  },
                  box: {
                    type: Type.ARRAY,
                    items: { type: Type.INTEGER },
                    description:
                      'Bounding box [ymin, xmin, ymax, xmax] normalized 0 to 1000.',
                  },
                },
                required: ['kn', 'translit', 'en', 'box'],
              },
            },
          },
        },
        true
      );

      res.json({ rawText: response.text || '[]' });
    } catch (err: unknown) {
      const errorObj = err as { status?: number; message?: string };
      if (
        errorObj?.status === 429 ||
        (typeof errorObj?.message === 'string' &&
          (errorObj.message.includes('429') ||
            errorObj.message.includes('RESOURCE_EXHAUSTED')))
      ) {
        res.status(429).json({ error: 'Rate limit exceeded' });
        return;
      }
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  });

  // =========================================================================
  // POST /api/anna/chat — MODULE 2A: Anna Conversational Brain
  // =========================================================================
  app.post('/api/anna/chat', async (req, res) => {
    try {
      const { userTranscript, history, model, persona, clientApiKey } =
        req.body || {};
      if (!userTranscript || typeof userTranscript !== 'string') {
        res.status(400).json({ error: 'Missing userTranscript' });
        return;
      }

      const ai = getGenAIClient(clientApiKey);
      if (!ai) {
        res.status(503).json({ error: 'Gemini API key not configured' });
        return;
      }

      const recentHistory = Array.isArray(history) ? history.slice(-8) : [];
      const speakerLabel =
        persona && typeof persona.title === 'string' && persona.title.trim()
          ? persona.title.trim()
          : 'Anna';

      const historyLines = recentHistory
        .map(
          (turn: {
            role?: string;
            text?: string;
            kanglish?: string;
            english?: string;
          }) => {
            const speaker = turn.role === 'anna' ? speakerLabel : 'Learner';
            const content =
              turn.role === 'anna'
                ? `${turn.kanglish || turn.text || ''} (EN: ${turn.english || ''})`
                : turn.text || '';
            return `${speaker}: ${content}`;
          }
        )
        .join('\n');

      const personaInstruction =
        persona && typeof persona.title === 'string' && persona.title.trim()
          ? `\n\nACTIVE ROLEPLAY ROLE: "${persona.title}" (${persona.tagline || 'Bengaluru local'}).\nStay 100% in character as a real Bengaluru ${persona.title}. Answer the learner's exact English or Kanglish question/request directly (e.g. if you are a Waiter, take their food/coffee order, answer menu/price/bill questions; if you are a Ticket Conductor, issue bus tickets, tell fares and stops; if you are an Auto Driver, discuss meter, fare, and route; if you are a Shopkeeper, help with groceries, prices, and UPI). In the "english" field, translate your reply and briefly show how the learner can say their English sentence in Kannada.`
          : '';

      const prompt = historyLines
        ? `Recent conversation (last ${recentHistory.length} turns):\n${historyLines}\n\nLearner: ${userTranscript}\n\nThink carefully about what the learner just said or asked, and respond directly as ${speakerLabel} in STRICT JSON:`
        : `Learner: ${userTranscript}\n\nThink carefully about what the learner just said or asked, and respond directly as ${speakerLabel} in STRICT JSON:`;

      const response = await generateContentWithFallback(ai, {
        model: resolveBrainModel(model),
        contents: prompt,
        config: {
          systemInstruction: `${ANNA_SYSTEM_PROMPT}${personaInstruction}`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              kanglish: {
                type: Type.STRING,
                description:
                  'Short 1-2 sentence reply in romanized Bengaluru Kanglish answering the learner directly and contextually.',
              },
              script: {
                type: Type.STRING,
                description:
                  'The exact Kanglish reply written in native Kannada script (e.g. ಹೌದು ಗುರು!) for authentic speech pronunciation.',
              },
              english: {
                type: Type.STRING,
                description:
                  "Faithful English translation of the Kanglish reply.",
              },
              correction: {
                type: Type.STRING,
                nullable: true,
                description:
                  'One gentle correction if learner Kanglish was broken, or null.',
              },
              mood: {
                type: Type.STRING,
                description: 'One of: happy, neutral, excited, thinking.',
              },
            },
            required: ['kanglish', 'script', 'english', 'mood'],
          },
        },
      });

      const rawText = response.text || '';
      try {
        const cleaned = rawText
          .trim()
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/, '');
        const parsed = JSON.parse(cleaned);
        if (!parsed.script || typeof parsed.script !== 'string' || !parsed.script.trim()) {
          parsed.script = parsed.kanglish || '';
        }
        res.json({ rawText: JSON.stringify(parsed) });
        return;
      } catch (jsonErr) {
        console.warn(
          '[server /api/anna/chat] Model response JSON parse failed:',
          jsonErr,
          rawText
        );
        res.status(500).json({ error: 'Invalid JSON model response' });
        return;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.warn('[server /api/anna/chat] Error generating content:', err);
      res.status(500).json({ error: message });
    }
  });

  // =========================================================================
  // POST /api/anna/score-speak — MODULE 2B: Semantic Speak Exercise Scoring
  // =========================================================================
  app.post('/api/anna/score-speak', async (req, res) => {
    try {
      const { targetKn, userTranscript, model, clientApiKey } = req.body || {};
      if (!targetKn || !userTranscript) {
        res.status(400).json({ error: 'Missing targetKn or userTranscript' });
        return;
      }

      const ai = getGenAIClient(clientApiKey);
      if (!ai) {
        res.status(503).json({ error: 'Gemini API key not configured' });
        return;
      }

      const prompt = `Target sentence: '${targetKn}'. Learner said: '${userTranscript}' (may be Kannada script or romanized, may have recognition errors). Do they mean the same? Output STRICT JSON: {"match": true|false, "feedback": "one short encouraging line in English"}`;

      const response = await generateContentWithFallback(ai, {
        model: resolveBrainModel(model),
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              match: {
                type: Type.BOOLEAN,
                description:
                  'True if the learner utterance means the same or is a close spoken attempt at the target Kannada/Kanglish phrase.',
              },
              feedback: {
                type: Type.STRING,
                description: 'One short encouraging line in English.',
              },
            },
            required: ['match', 'feedback'],
          },
        },
      });

      res.json({ rawText: response.text || '' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.warn('[server /api/anna/score-speak] Error scoring speak:', err);
      res.status(500).json({ error: message });
    }
  });

  // =========================================================================
  // MODULE 3: Nano Banana (gemini-3.1-flash-lite-image) Doodle Image Generator
  // =========================================================================
  const doodlesDir = path.join(__dirname, 'public', 'assets', 'doodles');
  try {
    fs.mkdirSync(doodlesDir, { recursive: true });
  } catch {
    // Ignore directory creation errors
  }
  app.use(
    '/assets/doodles',
    express.static(doodlesDir, {
      maxAge: '365d',
      immutable: true,
    })
  );

  app.get('/api/doodles/manifest', (_req, res) => {
    try {
      const files = fs.existsSync(doodlesDir) ? fs.readdirSync(doodlesDir) : [];
      const manifest: Record<string, string> = {};
      for (const file of files) {
        if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.webp')) {
          const id = file.replace(/\.(png|jpg|webp)$/i, '');
          manifest[id] = `/assets/doodles/${file}`;
        }
      }
      res.json({ manifest });
    } catch {
      res.json({ manifest: {} });
    }
  });

  let nanoBananaCooldownUntil = 0;

  app.post('/api/doodles/nano-banana', async (req, res) => {
    try {
      const { doodleId, prompt, clientApiKey } = req.body || {};
      if (!doodleId || typeof doodleId !== 'string' || !prompt || typeof prompt !== 'string') {
        res.status(200).json({ imageUrl: null, quotaLimited: true });
        return;
      }

      const safeId = doodleId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const existingFile = path.join(doodlesDir, `${safeId}.png`);
      if (fs.existsSync(existingFile)) {
        res.json({ imageUrl: `/assets/doodles/${safeId}.png`, cached: true });
        return;
      }

      if (Date.now() < nanoBananaCooldownUntil) {
        res.status(200).json({ imageUrl: null, quotaLimited: true });
        return;
      }

      const ai = getGenAIClient(clientApiKey);
      if (!ai) {
        res.status(200).json({ imageUrl: null, quotaLimited: true });
        return;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [
            {
              text: prompt,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: '1:1',
          },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      let base64Image = '';
      for (const part of parts) {
        if (part.inlineData?.data) {
          base64Image = part.inlineData.data;
          break;
        }
      }

      if (!base64Image) {
        res.status(200).json({ imageUrl: null, quotaLimited: true });
        return;
      }

      const buffer = Buffer.from(base64Image, 'base64');
      try {
        fs.writeFileSync(existingFile, buffer);
        res.json({ imageUrl: `/assets/doodles/${safeId}.png`, cached: false });
      } catch {
        res.json({
          imageUrl: `data:image/png;base64,${base64Image}`,
          cached: false,
        });
      }
    } catch {
      // If the active key is on Free Tier (limit: 0 for gemini-3.1-flash-lite-image) or rate-limited,
      // enter cooldown silently and return a clean 200 fallback response so the client uses rasterized PNG/SVG images.
      nanoBananaCooldownUntil = Date.now() + 10 * 60 * 1000;
      res.status(200).json({ imageUrl: null, quotaLimited: true });
    }
  });

  const server = http.createServer(app);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let vite: any = null;
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // =========================================================================
  // WS /api/anna/live-transcribe — MODULE 1: Gemini Transcribe Live Bridge
  // =========================================================================
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = request.url ? request.url.split('?')[0] : '';
    if (pathname === '/api/anna/live-transcribe') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else if (vite?.ws) {
      try {
        vite.ws.handleUpgrade(request, socket, head);
      } catch {
        // Ignore unhandled upgrade
      }
    }
  });

  wss.on('connection', async (clientWs: WebSocket, request) => {
    const urlObj = new URL(
      request.url || '',
      `http://${request.headers.host || 'localhost'}`
    );
    const clientKey = urlObj.searchParams.get('key') || undefined;
    const requestedModel =
      urlObj.searchParams.get('model') || 'gemini-3.5-transcribe-live';

    const ai = getGenAIClient(clientKey);
    if (!ai) {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            type: 'error',
            error: 'Gemini API key not available on server',
          })
        );
        clientWs.close();
      }
      return;
    }

    let accumulatedTranscript = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let liveSession: any = null;
    let isClosed = false;

    try {
      const sessionPromise = ai.live.connect({
        model: requestedModel,
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          systemInstruction:
            'You are a speech transcription receiver for Kannada and English (Kanglish). Listen to the user audio.',
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (isClosed || clientWs.readyState !== WebSocket.OPEN) return;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const serverContent = (message as any)?.serverContent;
            const inputText =
              serverContent?.inputTranscription?.text ||
              serverContent?.inputAudioTranscription?.text ||
              '';

            if (inputText) {
              accumulatedTranscript =
                `${accumulatedTranscript} ${inputText}`.trim();
              clientWs.send(
                JSON.stringify({
                  type: 'partial',
                  transcript: accumulatedTranscript,
                })
              );
            }
          },
          onerror: () => {
            if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: 'error',
                  error: 'Live transcription session error',
                })
              );
            }
          },
          onclose: () => {
            if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: 'final',
                  transcript: accumulatedTranscript.trim(),
                })
              );
            }
          },
        },
      });

      liveSession = await sessionPromise;

      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: 'ready' }));
      }

      clientWs.on('message', (raw) => {
        try {
          const parsed = JSON.parse(raw.toString());
          if (parsed.type === 'audio' && parsed.audio && liveSession) {
            liveSession.sendRealtimeInput({
              audio: {
                data: parsed.audio,
                mimeType: 'audio/pcm;rate=16000',
              },
            });
          } else if (parsed.type === 'stop') {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: 'final',
                  transcript: accumulatedTranscript.trim(),
                })
              );
            }
            if (liveSession) {
              try {
                liveSession.close();
              } catch {
                // Ignore close errors
              }
              liveSession = null;
            }
          }
        } catch {
          // Ignore malformed client frames
        }
      });

      clientWs.on('close', () => {
        isClosed = true;
        if (liveSession) {
          try {
            liveSession.close();
          } catch {
            // Ignore close errors
          }
          liveSession = null;
        }
      });
    } catch (err) {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            type: 'error',
            error:
              err instanceof Error
                ? err.message
                : 'Failed to connect to Gemini Transcribe Live',
          })
        );
        clientWs.close();
      }
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Kanglish Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
