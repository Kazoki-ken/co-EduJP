'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Volume2, AlertCircle, Sparkles, RotateCcw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { getAccessToken } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

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

// ─── Suggestion chips ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  '🌸 How do I use 食べます in a sentence?',
  '🔤 What\'s the difference between は and が?',
  '🃏 Can you quiz me on common food words?',
  '🈳 What does 大丈夫 mean and when is it used?',
  '📚 Give me 5 beginner vocabulary words',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function playTts(text: string) {
  const url = `${API_BASE}/tts?text=${encodeURIComponent(text)}&voice=ja-JP-NanamiNeural`;
  fetch(url)
    .then((r) => r.blob())
    .then((b) => new Audio(URL.createObjectURL(b)).play())
    .catch(() => {});
}

function extractJapanese(text: string): string | null {
  const match = text.match(/[\u3040-\u30ff\u4e00-\u9fff]+/g);
  return match ? match.join('') : null;
}

// ─── Bubble Components ────────────────────────────────────────────────────────

function UserBubble({ msg }: { msg: Message }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex justify-end gap-2.5"
    >
      <div className="max-w-[78%] bg-primary text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-glow-sm">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
      </div>
      <div className="w-7 h-7 rounded-full bg-primary/30 border border-primary/50
                      flex items-center justify-center shrink-0 mt-0.5">
        <User size={13} className="text-primary" />
      </div>
    </motion.div>
  );
}

function AssistantBubble({ msg }: { msg: Message }) {
  const japanese = extractJapanese(msg.content);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex gap-2.5"
    >
      <div className="w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/40
                      flex items-center justify-center shrink-0 mt-0.5">
        <Bot size={13} className="text-violet-400" />
      </div>

      <div className={cn(
        'max-w-[78%] rounded-2xl rounded-tl-sm px-4 py-3',
        msg.error
          ? 'bg-danger/10 border border-danger/30'
          : 'bg-surface/80 border border-border',
      )}>
        <p className={cn(
          'text-sm leading-relaxed whitespace-pre-wrap',
          msg.error ? 'text-danger' : 'text-text-primary',
        )}>
          {msg.content}
          {msg.isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 rounded-sm animate-pulse" />
          )}
        </p>

        {/* TTS button for messages with Japanese */}
        {!msg.isStreaming && !msg.error && japanese && (
          <button
            onClick={() => playTts(japanese)}
            className="mt-2 flex items-center gap-1 text-xs text-text-muted hover:text-primary transition-colors"
          >
            <Volume2 size={11} /> Listen to Japanese
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Chat Page ────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [siteName,  setSiteName]  = useState('VocabJP');
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState('');
  const [isBusy,    setIsBusy]    = useState(false);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);
  const abortRef    = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/config/public`)
      .then(res => res.json())
      .then(data => { if (data.site_name) setSiteName(data.site_name); })
      .catch(() => {});
  }, []);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Build history array from existing messages (max 20 turns)
  const buildHistory = useCallback((): ChatTurn[] => {
    return messages
      .filter((m) => !m.error)
      .slice(-20)
      .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', text: m.content }));
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    setInput('');
    setIsBusy(true);

    const userMsg: Message = {
      id:      crypto.randomUUID(),
      role:    'user',
      content: trimmed,
    };

    const assistantId  = crypto.randomUUID();
    const assistantMsg: Message = {
      id:          assistantId,
      role:        'assistant',
      content:     '',
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    abortRef.current = new AbortController();

    try {
      const history = buildHistory();

      const res = await fetch(`${API_BASE}/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAccessToken() ?? ''}` },
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
            const dataMatch = line.match(/data:\s*(\{.+\})/s);
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
          if (payload === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const { text: chunk } = JSON.parse(payload) as { text: string };
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + chunk }
                  : m,
              ),
            );
          } catch {}
        }
      }


      // Finalise: mark not streaming
      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, isStreaming: false } : m),
      );
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message ?? 'Something went wrong. Please try again.';
      if (errMsg !== 'AbortError') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: errMsg, isStreaming: false, error: true }
              : m,
          ),
        );
      }
    } finally {
      setIsBusy(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isBusy, buildHistory]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setIsBusy(false);
    setInput('');
  };

  if (authLoading) return null;
  if (!isAuthenticated) {
    return (
      <div className="page-container py-24 text-center">
        <Bot size={48} className="text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-text-primary mb-2">Vocabulary AI Chat</h2>
        <p className="text-text-muted mb-6">Please sign in to practice with the AI tutor.</p>
        <Link href="/auth/login" className="btn-primary">Sign In</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-border/60 bg-surface/60 backdrop-blur-md px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/40
                            flex items-center justify-center">
              <Sparkles size={16} className="text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-text-primary text-sm">{siteName} AI Tutor</h1>
              <p className="text-xs text-text-muted">Powered by Gemini — vocabulary only</p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-danger transition-colors"
            >
              <RotateCcw size={12} /> New chat
            </button>
          )}
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Welcome */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-8"
            >
              <div className="text-5xl mb-4">🤖</div>
              <h2 className="text-xl font-bold text-text-primary mb-2">
                こんにちは！Let's practice vocabulary.
              </h2>
              <p className="text-text-muted text-sm max-w-sm mx-auto mb-7">
                I'm your vocabulary practice partner. Ask me to explain words, quiz you,
                or give examples. I won't help with general translation or grammar lessons.
              </p>

              {/* Suggestion chips */}
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-xs px-3 py-2 rounded-xl border border-border
                               text-text-muted hover:border-primary/50 hover:text-primary
                               hover:bg-primary/5 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Message list */}
          <AnimatePresence initial={false}>
            {messages.map((msg) =>
              msg.role === 'user'
                ? <UserBubble key={msg.id} msg={msg} />
                : <AssistantBubble key={msg.id} msg={msg} />
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input ──────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-border/60 bg-surface/60 backdrop-blur-md p-4">
        <div className="max-w-3xl mx-auto flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about a word, request examples, or ask for a quiz… (Enter to send)"
            rows={1}
            disabled={isBusy}
            className={cn(
              'flex-1 input-field resize-none min-h-[44px] max-h-[120px] overflow-y-auto py-3',
              'leading-relaxed',
            )}
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
              : <Send size={16} />
            }
          </button>
        </div>
        <p className="text-center text-xs text-text-muted mt-2">
          Shift+Enter for new line · Strictly vocabulary practice
        </p>
      </div>
    </div>
  );
}
