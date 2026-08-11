'use client';

import { getAccessToken } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

/**
 * Speaks the tutor's reply while it is still being generated.
 *
 * Waiting for the full reply before synthesising costs about two seconds of
 * silence — the model has to finish, then Edge TTS has to render the whole
 * paragraph. Instead the first complete sentence is sent to speech as soon as
 * it appears, which is typically ~400 ms in, and the rest follows while that
 * sentence is playing.
 *
 * The split is deliberately 2 requests, not one per sentence: every request
 * spends one unit of the learner's daily TTS allowance, so a five-sentence
 * answer would otherwise cost five units and burn a free account's day in ten
 * replies. First sentence for latency, remainder in bulk for the quota.
 */

/** Sentence enders in both scripts, plus a hard newline. */
const SENTENCE_END = /[.!?。！？\n]/;

export interface SenseiVoiceOptions {
  /** Voice for the Uzbek explanation. */
  voice?: string;
  /** Voice for the Japanese words inside it. */
  jaVoice?: string;
  /** SSML rate for the explanation, e.g. "+25%". Japanese keeps its own pace. */
  rate?: string;
  /** Fired when audio actually starts and stops — drives the avatar's mouth. */
  onSpeakingChange?: (speaking: boolean) => void;
  onError?: (message: string) => void;
}

export class SenseiVoice {
  private buffer = '';
  private firstSentenceSent = false;
  /** Serialises playback: each clip waits for the previous one to end. */
  private chain: Promise<void> = Promise.resolve();
  private stopped = false;
  private playing: HTMLAudioElement | null = null;
  private objectUrls = new Set<string>();
  private pending = 0;

  constructor(private options: SenseiVoiceOptions = {}) {}

  /** Feed a streamed chunk of the reply. */
  feed(chunk: string): void {
    if (this.stopped) return;
    this.buffer += chunk;

    if (this.firstSentenceSent) return;

    // Wait for a sentence worth speaking — a two-character fragment like "Ha."
    // arrives before the model has said anything useful.
    const match = this.buffer.match(SENTENCE_END);
    if (!match || match.index === undefined) return;
    const end = match.index + 1;
    if (end < 12) return;

    const sentence = this.buffer.slice(0, end);
    this.buffer = this.buffer.slice(end);
    this.firstSentenceSent = true;
    this.enqueue(sentence);
  }

  /** The reply is complete — speak whatever is left. */
  finish(): void {
    if (this.stopped) return;
    const rest = this.buffer.trim();
    this.buffer = '';
    if (rest) this.enqueue(rest);
  }

  /** Cancel everything: in-flight fetches are ignored, playback stops now. */
  stop(): void {
    this.stopped = true;
    this.buffer = '';
    if (this.playing) {
      this.playing.pause();
      this.playing = null;
    }
    this.objectUrls.forEach((url) => URL.revokeObjectURL(url));
    this.objectUrls.clear();
    this.options.onSpeakingChange?.(false);
  }

  private enqueue(text: string): void {
    const clean = text.trim();
    if (!clean) return;

    this.pending++;
    // The fetch starts immediately; only playback is chained. That is what lets
    // the second clip download while the first one is still being heard.
    const audioPromise = this.fetchAudio(clean);

    this.chain = this.chain
      .then(async () => {
        const blob = await audioPromise;
        if (!blob || this.stopped) return;
        await this.play(blob);
      })
      .catch(() => { /* one failed clip must not break the chain */ })
      .finally(() => {
        this.pending--;
        if (this.pending === 0) this.options.onSpeakingChange?.(false);
      });
  }

  private async fetchAudio(text: string): Promise<Blob | null> {
    const params = new URLSearchParams({ text: text.slice(0, 600) });
    if (this.options.voice) params.set('voice', this.options.voice);
    if (this.options.jaVoice) params.set('jaVoice', this.options.jaVoice);
    if (this.options.rate) params.set('rate', this.options.rate);

    try {
      const res = await fetch(`${API_BASE}/tts/dialogue?${params}`, {
        headers: {
          Authorization: `Bearer ${getAccessToken() ?? ''}`,
          'x-timezone-offset': String(new Date().getTimezoneOffset()),
        },
        credentials: 'include',
      });

      if (!res.ok) {
        // 402 means the daily listening allowance is spent. The reply is still
        // on screen, so this is a downgrade to text, not a failure.
        this.options.onError?.(
          res.status === 402
            ? "Bugungi ovoz limiti tugadi — javobni o'qib olishingiz mumkin."
            : "Ovozni yaratib bo'lmadi.",
        );
        return null;
      }

      return await res.blob();
    } catch {
      this.options.onError?.("Ovozni yaratib bo'lmadi.");
      return null;
    }
  }

  private play(blob: Blob): Promise<void> {
    return new Promise((resolve) => {
      if (this.stopped) return resolve();

      const url = URL.createObjectURL(blob);
      this.objectUrls.add(url);
      const audio = new Audio(url);
      this.playing = audio;

      const done = () => {
        URL.revokeObjectURL(url);
        this.objectUrls.delete(url);
        if (this.playing === audio) this.playing = null;
        resolve();
      };

      audio.onended = done;
      audio.onerror = done;

      this.options.onSpeakingChange?.(true);
      // Autoplay is blocked until the user has interacted with the page; the
      // voice mode is only reachable by tapping the mic, so this is defensive.
      audio.play().catch(done);
    });
  }
}

/** The two kitsune the learner can study with — day fox and night fox. */
export const SENSEI_VOICES = [
  { id: 'uz-UZ-MadinaNeural', jaVoice: 'ja-JP-NanamiNeural', name: 'Kon-sensei',  emoji: '🦊' },
  { id: 'uz-UZ-SardorNeural', jaVoice: 'ja-JP-KeitaNeural',  name: 'Yoru-sensei', emoji: '🌙' },
] as const;
