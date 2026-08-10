const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

/** Nanami is the most natural Japanese female neural voice the backend offers. */
const DEFAULT_VOICE = 'ja-JP-NanamiNeural';

/**
 * Plays a word's pronunciation.
 *
 * Every caller used to inline `new Audio(URL.createObjectURL(blob)).play()`.
 * That object URL pins the decoded MP3 in memory until the page is reloaded,
 * so a learner tapping the speaker through a 20-round game left twenty blobs
 * behind. Revoking it after playback is the whole reason this helper exists —
 * it is easy to forget at seven different call sites, and impossible to forget
 * at one.
 */
export async function speak(
  text: string,
  options: { voice?: string; onStart?: () => void; onEnd?: () => void } = {},
): Promise<void> {
  const { voice = DEFAULT_VOICE, onStart, onEnd } = options;
  if (!text.trim()) return;

  let url: string | null = null;
  const done = () => {
    if (url) {
      URL.revokeObjectURL(url);
      url = null;
    }
    onEnd?.();
  };

  try {
    const res = await fetch(
      `${API_BASE}/tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}`,
    );
    if (!res.ok) {
      // A spent daily quota answers 402 here; there is nothing to play, and the
      // page's own quota bar already explains why.
      done();
      return;
    }

    const blob = await res.blob();
    url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    onStart?.();
    // Both paths free the blob: `error` fires when the browser refuses to
    // decode, and without it the URL would leak exactly as before.
    audio.onended = done;
    audio.onerror = done;

    await audio.play().catch(done);
  } catch {
    done();
  }
}

/** The word shape every caller happens to have to hand. */
export interface SpeakableWord {
  japaneseWord: string;
  hiragana?: string | null;
}

/** Prefers the reading, which the voice pronounces more reliably than kanji. */
export const speakWord = (
  word: SpeakableWord,
  options?: Parameters<typeof speak>[1],
): Promise<void> => speak(word.hiragana || word.japaneseWord, options);
