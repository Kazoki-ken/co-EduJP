import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { streamChat, ChatMessage, resolveGeminiApiKey } from '../services/gemini.service';
import { synthesise, getJapaneseVoices } from '../services/tts.service';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const ChatBodySchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message must be 1000 characters or fewer'),
  /**
   * Optional previous turns sent by the client.
   * Max 20 turns kept to bound context window cost.
   */
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        text: z.string().max(2000),
      }),
    )
    .max(20)
    .optional()
    .default([]),
});

const TtsQuerySchema = z.object({
  text: z
    .string()
    .min(1, 'text query parameter is required')
    .max(400, 'text must be 400 characters or fewer'),
  voice: z.string().optional(),
  lang: z.string().optional(), // convenience alias for voice locale
});

// ─── 1. Gemini Chat — Server-Sent Events Streaming ───────────────────────────

/**
 * POST /api/chat
 *
 * Streams a vocabulary-practice Gemini response via Server-Sent Events.
 *
 * SSE event format:
 *   data: {"text":"chunk"}\n\n          — text chunk
 *   data: [DONE]\n\n                    — stream complete
 *   event: error\ndata: {"error":"…"}\n\n — stream error
 *
 * IMPORTANT: The API key is resolved and validated BEFORE response headers are
 * sent. This means a 503/400 JSON error can still be returned normally if the
 * key is missing or the body is invalid.
 */
export const chatHandler = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  // ── 1. Validate request body ───────────────────────────────────────────────
  const parsed = ChatBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message });
    return;
  }

  const { message, history } = parsed.data;

  // ── 2. Pre-validate API key BEFORE committing to SSE headers ──────────────
  // This ensures a clean JSON error (400/503) can be returned if the key is
  // missing or invalid, rather than the response being locked to SSE mode.
  let apiKey: string;
  try {
    apiKey = await resolveGeminiApiKey();
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode ?? 503;
    const errMsg = (err as Error).message ?? 'Gemini API key is not configured.';
    res.status(status).json({ error: errMsg });
    return;
  }

  // ── 3. Set SSE headers (only after key is confirmed valid) ─────────────────
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
  res.flushHeaders(); // send headers immediately so client connects

  // ── 4. Handle client disconnect ───────────────────────────────────────────
  const abortController = new AbortController();
  req.on('close', () => abortController.abort());

  // ── 5. Stream from Gemini (pass pre-resolved key to avoid a second DB hit) ─
  await streamChat(
    message,
    history as ChatMessage[],
    {
      onChunk: (text) => {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      },
      onDone: () => {
        res.write('data: [DONE]\n\n');
        res.end();
      },
      onError: (err) => {
        // Send error as an SSE error event then close
        res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      },
    },
    abortController.signal,
    apiKey,
  );
};

// ─── 2. Text-to-Speech ────────────────────────────────────────────────────────

/**
 * GET /api/tts?text=日本語&voice=ja-JP-NanamiNeural
 *
 * Returns a raw MP3 audio buffer with proper headers.
 * Cached in-memory for 24 hours keyed by voice + text.
 *
 * Query params:
 *   text  — text to synthesise (required, max 400 chars)
 *   voice — voice short-name or locale alias (optional, default: ja-JP-NanamiNeural)
 *   lang  — convenience alias for voice locale (e.g. "ja-JP")
 */
export const ttsHandler = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const parsed = TtsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message });
    return;
  }

  const { text, voice, lang } = parsed.data;

  // `voice` takes priority over `lang`; if neither provided the service defaults to Nanami
  const resolvedVoice = voice ?? lang;

  const audioBuffer = await synthesise(text, resolvedVoice);

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Content-Length', audioBuffer.length);
  res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 h browser cache
  res.setHeader('Accept-Ranges', 'bytes');
  res.send(audioBuffer);
};

// ─── 3. Available TTS Voices ──────────────────────────────────────────────────

/**
/**
 * GET /api/tts/voices
 *
 * Returns the curated list of supported Japanese voices.
 * Used by the frontend voice-picker component.
 */
export const ttsVoicesHandler = (
  _req: AuthenticatedRequest,
  res: Response,
): void => {
  res.json(getJapaneseVoices());
};

import prisma from '../lib/prisma';

export const getPublicConfigHandler = async (
  _req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  const configs = await prisma.siteConfiguration.findMany({
    where: { key: { in: ['site_name'] } }
  });
  const data = Object.fromEntries(configs.map((c) => [c.key, c.value]));
  res.json(data);
};
