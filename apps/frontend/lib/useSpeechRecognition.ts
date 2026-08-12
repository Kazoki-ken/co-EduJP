'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Browser speech-to-text, via the Web Speech API.
 *
 * This is the cheap half of the voice tutor: Chrome and Edge stream the audio
 * to Google's recogniser for free, so a spoken lesson costs the same as a typed
 * one. The trade is coverage — Firefox has no implementation at all, and iOS
 * Safari only added it recently and refuses continuous mode. `isSupported`
 * lets the page fall back to the keyboard rather than showing a dead button.
 */

// The API is still prefixed in Chrome, and is missing from lib.dom entirely.
interface SpeechRecognitionAlternative { transcript: string; confidence: number }
interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResult };
}
interface SpeechRecognitionErrorEventLike extends Event { error: string }
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const getRecognitionCtor = (): SpeechRecognitionCtor | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

/** Uzbek for the conversation, Japanese for pronunciation drills. */
export type RecognitionLang = 'uz-UZ' | 'ja-JP';

export interface UseSpeechRecognitionOptions {
  lang: RecognitionLang;
  /** Called once with the final transcript when the user stops speaking. */
  onFinal: (transcript: string) => void;
  /**
   * Called whenever the microphone truly closes, transcript or not.
   *
   * `onFinal` is not enough to drive the button's state: a session that ends
   * with nothing heard, or one killed by a network error, never reaches it, and
   * the button would sit there looking like it was still recording.
   */
  onStop?: () => void;
  /**
   * 'auto'  — the recogniser decides the sentence ended (a pause stops it).
   * 'hold'  — push-to-talk: it keeps listening until `stop()` is called, so a
   *           learner searching for the next word mid-sentence is not cut off.
   */
  mode?: 'auto' | 'hold';
}

export function useSpeechRecognition({
  lang, onFinal, onStop, mode = 'auto',
}: UseSpeechRecognitionOptions) {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  /** What the recogniser thinks it heard so far — shown live under the mic. */
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef('');
  const interimRef = useRef('');
  /**
   * Whether the user still wants the microphone open.
   *
   * Android Chrome ignores `continuous` and ends the session after a short
   * pause — the single biggest reason push-to-talk felt broken on phones, since
   * thinking mid-sentence silently ended the turn. While this is true, `onend`
   * restarts the recogniser instead of finalising, so a pause is just a pause.
   */
  const wantListeningRef = useRef(false);
  /** Guards a restart loop when the recogniser refuses to stay open at all. */
  const restartsRef = useRef(0);
  // The callback changes on every render of the page; reading it from a ref
  // keeps the recogniser from being torn down and rebuilt mid-sentence.
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;
  const onStopRef = useRef(onStop);
  onStopRef.current = onStop;

  useEffect(() => {
    setIsSupported(getRecognitionCtor() !== null);
  }, []);

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    recognitionRef.current?.stop();
  }, []);

  /** Opens one recogniser session. Accumulated text is deliberately kept. */
  const beginSession = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    // Tearing down any previous instance first — starting a live recogniser
    // twice throws InvalidStateError and leaves the mic indicator stuck on.
    recognitionRef.current?.abort();

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.interimResults = true;
    // Push-to-talk holds the channel open; auto mode lets a pause end the turn.
    recognition.continuous = mode === 'hold';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (e) => {
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const text = result[0]?.transcript ?? '';
        if (result.isFinal) finalRef.current += text;
        else interimText += text;
      }
      interimRef.current = interimText;
      setInterim(interimText);
    };

    recognition.onerror = (e) => {
      // 'aborted' and 'no-speech' are ordinary — the user changed their mind or
      // said nothing. On Android 'no-speech' fires constantly during a pause,
      // so it must not tear the session down; `onend` handles the restart.
      if (e.error === 'aborted' || e.error === 'no-speech') return;
      wantListeningRef.current = false;
      setIsListening(false);
      setError(
        e.error === 'not-allowed'
          ? "Mikrofonga ruxsat berilmadi. Brauzer sozlamalaridan ruxsat bering."
          : e.error === 'network'
            ? "Internet bilan bog'lanishda muammo — ovozni aniqlab bo'lmadi."
            : "Ovozni aniqlab bo'lmadi. Qaytadan urinib ko'ring.",
      );
    };

    recognition.onend = () => {
      // Phone ended the session on its own but the button is still held: keep
      // what was heard and open a new one. 40 restarts is far more than a real
      // sentence needs and stops a broken recogniser from spinning forever.
      if (wantListeningRef.current && restartsRef.current < 40) {
        restartsRef.current++;
        // Whatever was interim in the closing session will never be promoted,
        // so it is banked now or lost.
        if (interimRef.current.trim()) {
          finalRef.current += (finalRef.current ? ' ' : '') + interimRef.current.trim();
          interimRef.current = '';
        }
        beginSession();
        return;
      }

      wantListeningRef.current = false;
      setIsListening(false);
      // Chrome only promotes the last interim result to final when it has had a
      // moment of silence. Releasing the button mid-word ends the session
      // first, so the interim text is the only record of it — without this
      // fallback a short, quickly-released utterance is silently lost.
      const transcript = [finalRef.current, interimRef.current]
        .map((s) => s.trim()).filter(Boolean).join(' ');
      finalRef.current = '';
      interimRef.current = '';
      setInterim('');
      onStopRef.current?.();
      if (transcript) onFinalRef.current(transcript);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      wantListeningRef.current = false;
      setError("Mikrofonni ishga tushirib bo'lmadi. Qaytadan urinib ko'ring.");
      setIsListening(false);
    }
  }, [lang, mode]);

  const start = useCallback(() => {
    if (!getRecognitionCtor()) {
      setError("Brauzeringiz ovozli kiritishni qo'llab-quvvatlamaydi. Chrome yoki Edge'dan foydalaning.");
      return;
    }
    wantListeningRef.current = true;
    restartsRef.current = 0;
    finalRef.current = '';
    interimRef.current = '';
    setError(null);
    setInterim('');
    beginSession();
  }, [beginSession]);

  // Leaving the page mid-sentence must release the microphone.
  useEffect(() => () => {
    wantListeningRef.current = false;
    recognitionRef.current?.abort();
  }, []);

  return { isSupported, isListening, interim, error, start, stop, clearError: () => setError(null) };
}
