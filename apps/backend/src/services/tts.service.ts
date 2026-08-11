import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import type { ProsodyOptions } from 'msedge-tts/dist/Prosody';

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

/**
 * Speaking rate per language.
 *
 * The Uzbek neural voices ship with a noticeably slower baseline than the
 * Japanese ones — read at their default rate they sound like a public-address
 * announcement, which is what made the first version of the tutor unpleasant to
 * listen to. Japanese is left alone: a learner needs to hear the pronunciation
 * clearly, so speeding that up would defeat the point.
 */
const DEFAULT_RATE: Record<string, string> = {
  'uz-UZ': '+25%',
  'tr-TR': '+15%',
  'ru-RU': '+10%',
  'en-US': '+10%',
};

const rateForVoice = (voice: string): string | undefined => {
  const locale = voice.split('-').slice(0, 2).join('-');
  return DEFAULT_RATE[locale];
};

/** Maximum text length to synthesise in a single request. */
const MAX_TEXT_LENGTH = 400;

// ─── Simple In-Memory Audio Cache ────────────────────────────────────────────

interface CacheEntry {
  buffer: Buffer;
  createdAt: number;
}

/** Key format: `${voice}::${rate}::${text}` */
const audioCache = new Map<string, CacheEntry>();

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_MAX_SIZE = 500;

const getCacheKey = (voice: string, text: string, rate?: string) =>
  `${voice}::${rate ?? 'default'}::${text}`;

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
export const synthesise = async (
  text: string,
  voice?: string,
  rate?: string,
): Promise<Buffer> => {
  // Resolve voice
  const resolvedVoice =
    (voice && (VOICE_MAP[voice] ?? voice)) || DEFAULT_VOICE;

  const resolvedRate = rate ?? rateForVoice(resolvedVoice);

  // Sanitise text
  const sanitisedText = text.trim().slice(0, MAX_TEXT_LENGTH);
  if (!sanitisedText) {
    throw new Error('Text cannot be empty');
  }

  // Check cache first
  const cacheKey = getCacheKey(resolvedVoice, sanitisedText, resolvedRate);
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  // Synthesise via Edge TTS
  const tts = new MsEdgeTTS();
  await tts.setMetadata(resolvedVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  const buffer = await collectStream(
    tts,
    sanitisedText,
    resolvedRate ? { rate: resolvedRate } : undefined,
  );

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
const collectStream = (
  tts: MsEdgeTTS,
  text: string,
  prosody?: ProsodyOptions,
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const { audioStream } = tts.toStream(text, prosody);
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

// ─── Mixed-Language Dialogue Synthesis ───────────────────────────────────────

/**
 * The tutor answers in Uzbek with Japanese words embedded mid-sentence:
 *
 *   「食べる（たべる） "yemoq" degani.」
 *
 * Handing that whole string to one voice fails either way round — the Uzbek
 * voice reads 食べる as silence, the Japanese voice reads the Uzbek as noise.
 * So the text is cut into runs of Japanese and non-Japanese, each run is sent
 * to the matching voice, and the MP3s are concatenated. MP3 is a frame format
 * with no global header, so plain Buffer.concat produces a valid file.
 */

const UZBEK_VOICE = 'uz-UZ-MadinaNeural';
const JAPANESE_VOICE = 'ja-JP-NanamiNeural';

/** Kana, kanji and full-width Japanese punctuation. */
const JAPANESE_CHAR = /[぀-ヿ㐀-䶿一-鿿ｦ-ﾟ]/;

/**
 * Strips what a voice should not read aloud: emoji, markdown emphasis and the
 * furigana in parentheses (the kanji right before it was already spoken).
 */
const stripForSpeech = (text: string): string =>
  text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
    .replace(/[*_`#>]/g, '')
    .replace(/（[぀-ヿ]+）/g, '')
    .replace(/\([぀-ヿ]+\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

interface Segment {
  text: string;
  voice: string;
}

/** Splits text into alternating Japanese / non-Japanese runs. */
export const segmentByLanguage = (
  text: string,
  japaneseVoice = JAPANESE_VOICE,
  otherVoice = UZBEK_VOICE,
): Segment[] => {
  const segments: Segment[] = [];
  let current = '';
  let currentIsJa: boolean | null = null;

  for (const char of text) {
    const isJa = JAPANESE_CHAR.test(char);

    // Spaces and shared punctuation belong to whichever run is open, so a
    // single space does not split "食べる yemoq" into three segments.
    if (currentIsJa !== null && /[\s、。,.!?！？:：;・\-—「」『』"'()]/.test(char)) {
      current += char;
      continue;
    }

    if (currentIsJa === null || isJa === currentIsJa) {
      current += char;
      currentIsJa = isJa;
      continue;
    }

    if (current.trim()) {
      segments.push({ text: current, voice: currentIsJa ? japaneseVoice : otherVoice });
    }
    current = char;
    currentIsJa = isJa;
  }

  if (current.trim() && currentIsJa !== null) {
    segments.push({ text: current, voice: currentIsJa ? japaneseVoice : otherVoice });
  }

  return segments;
};

/**
 * Synthesises a tutor reply, switching voices per language run.
 *
 * @param text          The raw reply text (emoji and markdown are stripped)
 * @param japaneseVoice Voice for the Japanese runs
 * @param otherVoice    Voice for everything else
 */
export const synthesiseDialogue = async (
  text: string,
  japaneseVoice?: string,
  otherVoice?: string,
  rate?: string,
): Promise<Buffer> => {
  const cleaned = stripForSpeech(text).slice(0, MAX_TEXT_LENGTH);
  if (!cleaned) throw new Error('Text cannot be empty');

  const segments = segmentByLanguage(
    cleaned,
    japaneseVoice && (VOICE_MAP[japaneseVoice] ?? japaneseVoice),
    otherVoice && (VOICE_MAP[otherVoice] ?? otherVoice),
  );

  // A single-language reply is the common case — no concatenation needed, and
  // it reuses the ordinary per-voice cache.
  // The requested rate applies to the explanation only — the Japanese runs keep
  // their own pace so the pronunciation stays intelligible.
  const rateFor = (voice: string) => (voice.startsWith('ja-') ? undefined : rate);

  if (segments.length <= 1) {
    const only = segments[0]?.voice ?? otherVoice ?? UZBEK_VOICE;
    return synthesise(cleaned, only, rateFor(only));
  }

  // Sequential, not parallel: Edge TTS drops connections when a single client
  // opens six sockets at once, and the segments are short anyway.
  const buffers: Buffer[] = [];
  for (const segment of segments) {
    const trimmed = segment.text.trim();
    if (!trimmed) continue;
    try {
      buffers.push(await synthesise(trimmed, segment.voice, rateFor(segment.voice)));
    } catch {
      // One unpronounceable run should not silence the whole sentence.
    }
  }

  if (buffers.length === 0) {
    throw new Error('Edge TTS returned empty audio for every segment.');
  }

  return Buffer.concat(buffers);
};

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
