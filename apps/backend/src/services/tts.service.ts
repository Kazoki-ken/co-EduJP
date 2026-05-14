import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// ─── Configuration ────────────────────────────────────────────────────────────

/**
 * Default voice — Nanami is the most natural female Japanese neural voice.
 * Keita is the natural male alternative.
 */
const VOICE_MAP: Record<string, string> = {
  'ja-JP': 'ja-JP-NanamiNeural',
  'ja-JP-female': 'ja-JP-NanamiNeural',
  'ja-JP-male': 'ja-JP-KeitaNeural',
  'en-US': 'en-US-AriaNeural',
};

const DEFAULT_VOICE = 'ja-JP-NanamiNeural';

/** Maximum text length to synthesise in a single request. */
const MAX_TEXT_LENGTH = 400;

// ─── Simple In-Memory Audio Cache ────────────────────────────────────────────

interface CacheEntry {
  buffer: Buffer;
  createdAt: number;
}

/** Key format: `${voice}::${text}` */
const audioCache = new Map<string, CacheEntry>();

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_MAX_SIZE = 500;

const getCacheKey = (voice: string, text: string) => `${voice}::${text}`;

const getFromCache = (key: string): Buffer | null => {
  const entry = audioCache.get(key);
  if (!entry) return null;

  // Expire stale entries
  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    audioCache.delete(key);
    return null;
  }

  return entry.buffer;
};

const setInCache = (key: string, buffer: Buffer): void => {
  // Evict oldest entries when full
  if (audioCache.size >= CACHE_MAX_SIZE) {
    const oldestKey = audioCache.keys().next().value;
    if (oldestKey) audioCache.delete(oldestKey);
  }
  audioCache.set(key, { buffer, createdAt: Date.now() });
};

// ─── Core TTS Synthesis ───────────────────────────────────────────────────────

/**
 * Synthesises speech for the given text using Microsoft Edge TTS.
 *
 * Returns a raw MP3 audio Buffer (48 kbps, 24 kHz, mono).
 * Results are cached in-memory for 24 hours.
 *
 * @param text   The text to synthesise (max 400 chars)
 * @param voice  Voice short-name or locale alias (see VOICE_MAP). Defaults to NanamiNeural.
 */
export const synthesise = async (text: string, voice?: string): Promise<Buffer> => {
  // Resolve voice
  const resolvedVoice =
    (voice && (VOICE_MAP[voice] ?? voice)) || DEFAULT_VOICE;

  // Sanitise text
  const sanitisedText = text.trim().slice(0, MAX_TEXT_LENGTH);
  if (!sanitisedText) {
    throw new Error('Text cannot be empty');
  }

  // Check cache first
  const cacheKey = getCacheKey(resolvedVoice, sanitisedText);
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  // Synthesise via Edge TTS
  const tts = new MsEdgeTTS();
  await tts.setMetadata(resolvedVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  const buffer = await collectStream(tts, sanitisedText);

  // Always close the WS connection after synthesis
  tts.close();

  // Store in cache
  setInCache(cacheKey, buffer);

  return buffer;
};

/**
 * Collects the audio stream from MsEdgeTTS into a single Buffer.
 * `toStream()` is synchronous — it returns streams immediately and data flows async.
 */
const collectStream = (tts: MsEdgeTTS, text: string): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const { audioStream } = tts.toStream(text);
    const chunks: Buffer[] = [];

    audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
    audioStream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      if (buffer.length === 0) {
        reject(new Error('Edge TTS returned empty audio — check the text or voice name.'));
        return;
      }
      resolve(buffer);
    });
    audioStream.on('error', (err: Error) => reject(err));
  });

// ─── Available Voices Helper ──────────────────────────────────────────────────

/**
 * Returns a curated list of Japanese voices supported by Edge TTS.
 * Used by the frontend voice-picker.
 */
export const getJapaneseVoices = () => [
  {
    id: 'ja-JP-NanamiNeural',
    name: 'Nanami (Female, Natural)',
    locale: 'ja-JP',
    gender: 'Female',
  },
  {
    id: 'ja-JP-KeitaNeural',
    name: 'Keita (Male, Natural)',
    locale: 'ja-JP',
    gender: 'Male',
  },
  {
    id: 'ja-JP-AoiNeural',
    name: 'Aoi (Female, Friendly)',
    locale: 'ja-JP',
    gender: 'Female',
  },
  {
    id: 'ja-JP-DaichiNeural',
    name: 'Daichi (Male, Calm)',
    locale: 'ja-JP',
    gender: 'Male',
  },
  {
    id: 'ja-JP-MayuNeural',
    name: 'Mayu (Female, Warm)',
    locale: 'ja-JP',
    gender: 'Female',
  },
  {
    id: 'ja-JP-NaokiNeural',
    name: 'Naoki (Male, Energetic)',
    locale: 'ja-JP',
    gender: 'Male',
  },
  {
    id: 'ja-JP-ShioriNeural',
    name: 'Shiori (Female, Cheerful)',
    locale: 'ja-JP',
    gender: 'Female',
  },
];
