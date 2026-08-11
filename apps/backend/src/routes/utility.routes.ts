import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import {
  chatHandler,
  ttsHandler,
  ttsDialogueHandler,
  ttsVoicesHandler,
  getPublicConfigHandler,
} from '../controllers/utility.controller';

const router = Router();

// ─── Chat Rate Limiter ────────────────────────────────────────────────────────
/**
 * Stricter limit on the AI chat endpoint to protect Gemini API quota.
 * 30 messages per user per 15 minutes.
 */
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate-limit per authenticated user ID (falls back to IP)
    const authReq = req as typeof req & { user?: { id: string } };
    return authReq.user?.id ?? req.ip ?? 'unknown';
  },
  message: { error: 'Too many chat messages. Please wait a few minutes before continuing.' },
});

// ─── TTS Rate Limiter ─────────────────────────────────────────────────────────
/**
 * TTS results are cached, so this mainly guards against cache-busting attacks.
 * 120 requests per 15 minutes per user.
 */
const ttsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many TTS requests. Please slow down.' },
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/chat
 *
 * Streams a vocabulary-focused Gemini AI response via Server-Sent Events.
 * Requires authentication.
 *
 * Body:
 *   message  (string, max 1000 chars) — the user's message
 *   history  (array, max 20 turns)    — previous conversation turns
 *
 * SSE events:
 *   data: {"text":"..."}   — text chunk
 *   data: [DONE]           — stream complete
 *   event: error           — error during stream
 */
router.post('/chat', authenticate, chatLimiter, chatHandler);

/**
 * GET /api/tts?text=...&voice=ja-JP-NanamiNeural
 *
 * Returns a raw MP3 audio buffer for the given text.
 * Authentication optional — public endpoint for word pronunciation.
 *
 * Query params:
 *   text  (required, max 400 chars)
 *   voice (optional) — voice short-name, e.g. "ja-JP-KeitaNeural"
 *   lang  (optional) — locale alias, e.g. "ja-JP"
 */
// optionalAuth, not authenticate: the dictionary is public, so anonymous
// visitors keep working — they simply fall under the IP limiter instead of a
// per-account daily quota.
router.get('/tts', optionalAuth, ttsLimiter, ttsHandler);

/**
 * GET /api/tts/dialogue?text=...&voice=uz-UZ-MadinaNeural&jaVoice=ja-JP-NanamiNeural
 *
 * Speaks one sentence of the AI tutor's reply, switching voices between the
 * Uzbek explanation and the Japanese words inside it. Used by the voice mode of
 * the chat page. Authentication required — this one is not public.
 */
router.get('/tts/dialogue', authenticate, ttsLimiter, ttsDialogueHandler);

/**
 * GET /api/tts/voices
 *
 * Returns a list of supported Japanese TTS voices for the frontend picker.
 */
router.get('/tts/voices', ttsVoicesHandler);

/**
 * GET /api/config/public
 *
 * Returns safe public site configurations (e.g., site_name)
 */
router.get('/config/public', getPublicConfigHandler);

export default router;
