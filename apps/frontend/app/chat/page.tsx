'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, User, Volume2, RotateCcw, Mic, MessageSquare, X, Square,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { QuotaBar } from '@/components/premium/UpgradeNotice';
import { SenseiAvatar, SenseiMood } from '@/components/chat/SenseiAvatar';
import { SakuraPetals } from '@/components/chat/SakuraPetals';
import { SenseiVoice, SENSEI_VOICES } from '@/lib/senseiVoice';
import { useSpeechRecognition, RecognitionLang } from '@/lib/useSpeechRecognition';
import { speak } from '@/lib/speak';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { getAccessToken } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

/** Speaking rate for the Uzbek explanation. The neural voice's own baseline is
 *  slow enough to sound like an announcement; this is the setting that made the
 *  tutor pleasant to listen to. */
const SPEECH_RATE = '+25%';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

interface Message {
  id:        string;
  role:      'user' | 'assistant';
  content:   string;
  isStreaming?: boolean;
  error?:    boolean;
}

type View = 'stage' | 'chat';

const SUGGESTIONS = [
  "🌸 食べます so'zi bilan misol gap tuzing",
  "🔤 見る va 観る so'zlarining farqi nima?",
  "🃏 Ovqatga oid so'zlardan test o'tkazing",
  "🈳 大丈夫 nimani anglatadi va qachon ishlatiladi?",
  "💡 わすれる so'zini yodlash uchun hiyla bering",
];

function extractJapanese(text: string): string | null {
  const match = text.match(/[぀-ヿ一-鿿]+/g);
  return match ? match.join('') : null;
}

// ─── Round control ────────────────────────────────────────────────────────────

/** The only chrome on the stage: circular, floating, no panel around it. */
function RoundButton({
  onClick, title, children, className,
}: {
  onClick: () => void; title: string; children: React.ReactNode; className?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        'w-10 h-10 rounded-full flex items-center justify-center',
        'bg-surface/70 backdrop-blur-md border border-border/70 text-text-secondary',
        'hover:text-accent hover:border-accent/60 active:scale-95 transition-all',
        className,
      )}
    >
      {children}
    </button>
  );
}

// ─── Chat-view bubbles ────────────────────────────────────────────────────────

function UserBubble({ msg }: { msg: Message }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      className="flex justify-end gap-2.5"
    >
      <div className="max-w-[78%] bg-primary-gradient text-white rounded-2xl rounded-br-sm px-4 py-3 shadow-glow-sm">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
      </div>
      <div className="w-8 h-8 rounded-full bg-primary/25 border border-primary/50
                      flex items-center justify-center shrink-0 mt-0.5">
        <User size={14} className="text-primary" />
      </div>
    </motion.div>
  );
}

function AssistantBubble({
  msg, variant, onReplay,
}: {
  msg: Message; variant: 'madina' | 'sardor'; onReplay: (text: string) => void;
}) {
  const japanese = extractJapanese(msg.content);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      className="flex gap-2.5"
    >
      <SenseiAvatar
        mood={msg.isStreaming ? 'thinking' : 'idle'}
        variant={variant}
        size={34}
        className="shrink-0 mt-0.5"
      />
      <div className={cn(
        'max-w-[78%] rounded-2xl rounded-bl-sm px-4 py-3 backdrop-blur-sm',
        msg.error
          ? 'bg-danger/10 border border-danger/30'
          : 'bg-surface/85 border border-border shadow-glass',
      )}>
        <p className={cn(
          'text-sm leading-relaxed whitespace-pre-wrap',
          msg.error ? 'text-danger' : 'text-text-primary',
        )}>
          {msg.content}
          {msg.isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-accent ml-0.5 rounded-sm animate-pulse" />
          )}
        </p>

        {!msg.isStreaming && !msg.error && (
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={() => onReplay(msg.content)}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-accent transition-colors"
            >
              <Volume2 size={11} /> {"Eshitish"}
            </button>
            {japanese && (
              <button
                onClick={() => void speak(japanese)}
                className="flex items-center gap-1 text-xs text-text-muted hover:text-primary transition-colors"
              >
                🎌 {"Yaponcha"}
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState('');
  const [isBusy,    setIsBusy]    = useState(false);
  const [view,      setView]      = useState<View>('stage');
  const [voiceIdx,  setVoiceIdx]  = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sttLang,   setSttLang]   = useState<RecognitionLang>('uz-UZ');
  const [notice,    setNotice]    = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const abortRef  = useRef<AbortController | null>(null);
  const voiceRef  = useRef<SenseiVoice | null>(null);

  const sensei = SENSEI_VOICES[voiceIdx]!;
  const variant: 'madina' | 'sardor' = voiceIdx === 0 ? 'madina' : 'sardor';

  /** The single reply the stage shows — the stage is not a transcript. */
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');

  useEffect(() => {
    if (view === 'chat') bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, view]);

  const buildHistory = useCallback((): ChatTurn[] => {
    return messages
      .filter((m) => !m.error)
      .slice(-20)
      .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', text: m.content }));
  }, [messages]);

  const silence = useCallback(() => {
    voiceRef.current?.stop();
    voiceRef.current = null;
    setIsSpeaking(false);
  }, []);

  const makeVoice = useCallback(() => new SenseiVoice({
    voice: sensei.id,
    jaVoice: sensei.jaVoice,
    rate: SPEECH_RATE,
    onSpeakingChange: setIsSpeaking,
    onError: (m) => setNotice(m),
  }), [sensei]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;

    // A new question interrupts the previous answer — nobody wants to wait out
    // a paragraph they already decided to move on from.
    voiceRef.current?.stop();
    voiceRef.current = null;
    setIsSpeaking(false);
    setNotice(null);
    setInput('');
    setIsBusy(true);

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: trimmed };
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: 'assistant', content: '', isStreaming: true },
    ]);

    abortRef.current = new AbortController();
    const voice = makeVoice();
    voiceRef.current = voice;

    try {
      const history = buildHistory();

      const res = await fetch(`${API_BASE}/chat`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAccessToken() ?? ''}`,
          'x-timezone-offset': String(new Date().getTimezoneOffset()),
        },
        body:    JSON.stringify({ message: trimmed, history }),
        signal:  abortRef.current.signal,
        credentials: 'include',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Chat failed.' }));
        throw new Error(err.error ?? 'Chat failed.');
      }

      const reader = res.body?.getReader();
      const dec    = new TextDecoder();
      let buffer   = '';
      let streamDone = false;

      while (reader && !streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += dec.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          // Handle SSE error event (multi-line block: "event: error\ndata: {...}")
          if (line.includes('event: error')) {
            const dataMatch = line.match(/data:\s*(\{[\s\S]+\})/);
            if (dataMatch) {
              try {
                const errData = JSON.parse(dataMatch[1]);
                throw new Error(errData.error || 'Stream error');
              } catch (parseErr) {
                if (parseErr instanceof SyntaxError) throw new Error('Stream error');
                throw parseErr;
              }
            }
            throw new Error('Stream error');
          }

          if (!line.startsWith('data: ')) continue;
          const payload = line.replace(/^data: /, '').trim();
          if (payload === '[DONE]') { streamDone = true; break; }

          try {
            const { text: chunk } = JSON.parse(payload) as { text: string };
            voice.feed(chunk);
            setMessages((prev) =>
              prev.map((m) => m.id === assistantId ? { ...m, content: m.content + chunk } : m),
            );
          } catch {}
        }
      }

      voice.finish();
      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, isStreaming: false } : m),
      );
    } catch (err: unknown) {
      // A cancelled request rejects with name 'AbortError' — its *message* is
      // browser-specific, so comparing the message left a red bubble behind on
      // every reset.
      const aborted = (err as Error)?.name === 'AbortError';
      const errMsg = (err as Error)?.message || "Xatolik yuz berdi. Qaytadan urinib ko'ring.";
      voice.stop();
      if (!aborted) {
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId
            ? { ...m, content: errMsg, isStreaming: false, error: true }
            : m),
        );
      }
    } finally {
      setIsBusy(false);
      if (view === 'chat') setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isBusy, buildHistory, view, makeVoice]);

  // ── Microphone: hold to talk, or tap to lock ──────────────────────────────
  /**
   * Holding a button steady is awkward on a phone, and a locked mic is awkward
   * on a desktop. The button does both: hold it and it releases on lift, tap it
   * and it stays open until the next tap. `activeRef` rather than `isListening`
   * decides which, because the recogniser reports its start asynchronously and
   * a quick tap can outrun it.
   */
  const activeRef = useRef(false);
  const pressStartRef = useRef(0);
  const [isLocked, setIsLocked] = useState(false);

  const {
    isSupported: micSupported, isListening, interim, error: micError, start: startMic, stop: stopMic,
  } = useSpeechRecognition({
    lang: sttLang,
    mode: 'hold',
    // Both fire on a normal turn; onStop also covers the paths onFinal never
    // reaches, so the button can never be left looking like it is recording.
    onStop: () => {
      activeRef.current = false;
      setIsLocked(false);
    },
    onFinal: (transcript) => { void sendMessage(transcript); },
  });

  const holdStart = useCallback(() => {
    if (isBusy || activeRef.current) return;
    activeRef.current = true;
    // The tutor must stop talking before the mic opens, or its own voice goes
    // straight back into the recogniser.
    silence();
    startMic();
  }, [isBusy, silence, startMic]);

  const holdEnd = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    setIsLocked(false);
    stopMic();
  }, [stopMic]);

  /** Short press = lock the mic open; long press = ordinary push-to-talk. */
  const TAP_MS = 400;

  const onMicPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    // Capturing the pointer keeps every later event on this button. Without it
    // a finger drifting a few pixels fired pointerleave and cut the recording
    // off mid-word — the main reason hold-to-talk felt broken on phones.
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (activeRef.current) { holdEnd(); return; }  // tap again to finish
    pressStartRef.current = Date.now();
    holdStart();
  };

  const onMicPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (!activeRef.current) return;
    if (Date.now() - pressStartRef.current < TAP_MS) { setIsLocked(true); return; }
    holdEnd();
  };

  // Space bar is the desktop equivalent of holding the button. `repeat` guards
  // against the key-repeat storm a held key produces.
  useEffect(() => {
    if (view !== 'stage' || !micSupported) return;

    const isTypingTarget = (t: EventTarget | null) =>
      t instanceof HTMLElement &&
      (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat || isTypingTarget(e.target)) return;
      e.preventDefault();
      holdStart();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || isTypingTarget(e.target)) return;
      e.preventDefault();
      holdEnd();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [view, micSupported, holdStart, holdEnd]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    abortRef.current?.abort();
    silence();
    holdEnd();
    setMessages([]);
    setIsBusy(false);
    setInput('');
    setNotice(null);
  };

  const replay = useCallback((text: string) => {
    silence();
    const v = makeVoice();
    voiceRef.current = v;
    v.feed(text);
    v.finish();
  }, [makeVoice, silence]);

  useEffect(() => () => voiceRef.current?.stop(), []);

  const mood: SenseiMood =
    isListening  ? 'listening'
    : isSpeaking ? 'speaking'
    : isBusy     ? 'thinking'
    : messages.length === 0 ? 'happy'
    : 'idle';

  if (authLoading) return null;
  if (!isAuthenticated) {
    return (
      <div className="page-container py-24 text-center">
        <SenseiAvatar mood="happy" variant="madina" size={110} className="mx-auto mb-5" />
        <h2 className="text-2xl font-bold text-text-primary mb-2">{"AI Sensei bilan so'zlashuv"}</h2>
        <p className="text-text-muted mb-6">{"Ustoz bilan mashq qilish uchun tizimga kiring."}</p>
        <Link href="/auth/login" className="btn-primary">{"Tizimga kirish"}</Link>
      </div>
    );
  }

  // ── Stage: one character, one bubble, one button ──────────────────────────
  if (view === 'stage') {
    // While the button is held the bubble mirrors the learner, not the tutor —
    // seeing the previous answer there made it look like the mic was ignored.
    const bubbleText = isListening
      ? (interim || 'Eshityapman…')
      : lastAssistant?.content
        || (isBusy ? '' : "Konnichiwa! Tugmani bosib turing va so'rang 🌸");

    return (
      <div
        className="chat-viewport relative flex flex-col items-center justify-between overflow-hidden select-none"
      >
        <SakuraPetals count={16} />

        {/* Floating controls — no bars, no panels */}
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          {messages.length > 0 && (
            <RoundButton onClick={clearChat} title="Yangi suhbat">
              <RotateCcw size={15} />
            </RoundButton>
          )}
          <RoundButton onClick={() => { silence(); holdEnd(); setView('chat'); }} title="Matnli suhbat">
            <MessageSquare size={16} />
          </RoundButton>
        </div>

        <div className="absolute top-4 left-4 z-20 flex gap-2">
          <RoundButton
            onClick={() => { silence(); setVoiceIdx((i) => (i + 1) % SENSEI_VOICES.length); }}
            title="Ustozni almashtirish"
          >
            <span className="text-base leading-none">
              {SENSEI_VOICES[(voiceIdx + 1) % SENSEI_VOICES.length]!.emoji}
            </span>
          </RoundButton>
          <RoundButton
            onClick={() => setSttLang((l) => (l === 'uz-UZ' ? 'ja-JP' : 'uz-UZ'))}
            title={sttLang === 'uz-UZ' ? "O'zbekcha gapiryapman" : 'Yaponcha gapiryapman'}
          >
            <span className="text-base leading-none">{sttLang === 'uz-UZ' ? '🇺🇿' : '🇯🇵'}</span>
          </RoundButton>
        </div>

        {/* Speech bubble + character */}
        <div className="relative z-10 flex-1 w-full flex flex-col items-center justify-center gap-1 px-5">
          <AnimatePresence mode="wait">
            {(bubbleText || isBusy) && (
              <motion.div
                key={isListening ? 'listening' : lastAssistant?.id ?? 'hint'}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                className="relative w-full max-w-md"
              >
                <div className={cn(
                  'rounded-3xl px-5 py-4 backdrop-blur-md border max-h-[38vh] overflow-y-auto',
                  lastAssistant?.error
                    ? 'bg-danger/10 border-danger/40'
                    : isListening
                      ? 'bg-primary/10 border-primary/40'
                      : 'bg-surface/85 border-border/80 shadow-glass',
                )}>
                  <p className={cn(
                    'text-[15px] leading-relaxed whitespace-pre-wrap text-center',
                    lastAssistant?.error ? 'text-danger'
                      : isListening ? 'text-text-secondary italic'
                      : 'text-text-primary',
                  )}>
                    {isBusy && !lastAssistant?.content ? (
                      <span className="inline-flex gap-1.5 py-1">
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            className="w-2 h-2 rounded-full bg-accent inline-block"
                            animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                          />
                        ))}
                      </span>
                    ) : bubbleText}
                    {lastAssistant?.isStreaming && (
                      <span className="inline-block w-1.5 h-4 bg-accent ml-0.5 rounded-sm align-middle animate-pulse" />
                    )}
                  </p>
                </div>

                {/* Tail, pointing down at the character */}
                <span className={cn(
                  'absolute left-1/2 -translate-x-1/2 -bottom-2 w-4 h-4 rotate-45 border-r border-b backdrop-blur-md',
                  lastAssistant?.error
                    ? 'bg-danger/10 border-danger/40'
                    : isListening
                      ? 'bg-primary/10 border-primary/40'
                      : 'bg-surface/85 border-border/80',
                )} />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            animate={{ scale: isSpeaking ? [1, 1.02, 1] : 1 }}
            transition={{ duration: 0.5, repeat: isSpeaking ? Infinity : 0 }}
            className="mt-6"
          >
            <SenseiAvatar mood={mood} variant={variant} size={200} />
          </motion.div>

          {notice || micError ? (
            <p className="mt-3 text-xs text-warning text-center max-w-xs">{notice ?? micError}</p>
          ) : null}
        </div>

        {/* Push-to-talk */}
        <div className="relative z-10 pb-8 flex flex-col items-center gap-3">
          {isSpeaking && (
            <button
              onClick={silence}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-danger transition-colors"
            >
              <Square size={10} /> {"To'xtatish"}
            </button>
          )}

          {!micSupported ? (
            <p className="text-xs text-text-muted text-center max-w-[15rem]">
              {"Bu brauzer ovozni qo'llab-quvvatlamaydi — Chrome yoki Edge'da oching."}
            </p>
          ) : (
            <>
              <div className="relative">
                {isListening && (
                  <span className="mic-ring absolute inset-0 rounded-full bg-primary" />
                )}
                <button
                  onPointerDown={onMicPointerDown}
                  onPointerUp={onMicPointerUp}
                  onPointerCancel={holdEnd}
                  onContextMenu={(e) => e.preventDefault()}
                  disabled={isBusy}
                  style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
                  className={cn(
                    'relative w-[88px] h-[88px] rounded-full flex items-center justify-center',
                    'border-2 transition-all touch-none select-none',
                    isListening
                      ? 'bg-primary border-primary text-white shadow-glow scale-110'
                      : isBusy
                        ? 'bg-surface-2 border-border text-text-muted cursor-not-allowed'
                        : 'bg-surface-2/80 backdrop-blur-md border-accent/50 text-accent hover:border-accent hover:shadow-glow-accent active:scale-95',
                  )}
                >
                  {isBusy
                    ? <div className="w-5 h-5 border-2 border-text-muted/30 border-t-accent rounded-full animate-spin" />
                    : isLocked ? <Square size={24} fill="currentColor" />
                    : <Mic size={28} />}
                </button>
              </div>

              <p className="text-[11px] text-text-muted text-center max-w-[16rem]">
                {isBusy ? "Ustoz o'ylayapti…"
                  : isLocked ? "Gapiring… tugatgach yana bosing"
                  : isListening ? "Gapiring… qo'yib yuborsangiz javob beradi"
                  : "Bosib turing va gapiring · yoki bir marta bosing"}
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Chat view: the full transcript, for reading and typing ────────────────
  return (
    <div className="chat-viewport relative flex flex-col overflow-hidden">
      <SakuraPetals count={8} />

      <div className="absolute top-3 right-4 z-20 flex gap-2">
        {messages.length > 0 && (
          <RoundButton onClick={clearChat} title="Yangi suhbat">
            <RotateCcw size={15} />
          </RoundButton>
        )}
        <RoundButton onClick={() => { silence(); setView('stage'); }} title="Ovozli rejimga qaytish">
          <X size={16} />
        </RoundButton>
      </div>

      <div className="relative shrink-0 px-4 pt-4">
        <QuotaBar kind="ai" className="max-w-3xl mx-auto pr-24" />
      </div>

      <div className="relative flex-1 overflow-y-auto px-4 py-5">
        <div className="max-w-3xl mx-auto space-y-5">
          {messages.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-6">
              <SenseiAvatar mood="happy" variant={variant} size={96} className="mx-auto mb-4" />
              <p className="text-text-muted text-sm max-w-sm mx-auto mb-6 leading-relaxed">
                {"Yapon so'zlari bo'yicha ustozingizman. So'z ma'nosini so'rang yoki test o'tkazishimni ayting."}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-xs px-3 py-2 rounded-xl border border-border bg-surface/60
                               text-text-muted hover:border-accent/50 hover:text-accent
                               hover:bg-accent/5 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg) =>
              msg.role === 'user'
                ? <UserBubble key={msg.id} msg={msg} />
                : <AssistantBubble key={msg.id} msg={msg} variant={variant} onReplay={replay} />
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="relative shrink-0 border-t border-border/50 bg-surface/60 backdrop-blur-md p-4">
        <div className="max-w-3xl mx-auto flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="So'z haqida so'rang… (Enter — yuborish)"
            rows={1}
            disabled={isBusy}
            className="input-field resize-none min-h-[44px] max-h-[120px] overflow-y-auto py-3 flex-1 leading-relaxed"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 120) + 'px';
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isBusy}
            className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all',
              input.trim() && !isBusy
                ? 'bg-primary hover:bg-primary-hover text-white shadow-glow-sm'
                : 'bg-surface-2 text-text-muted cursor-not-allowed',
            )}
          >
            {isBusy
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
