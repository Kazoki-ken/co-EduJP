'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useGoogleLogin } from '@react-oauth/google';
import {
  Mail, Lock, User, ArrowRight, ArrowLeft, Loader2, AlertCircle, Phone, Send,
  ShieldCheck,
} from 'lucide-react';
import SetupProfileModal from '@/components/auth/SetupProfileModal';
import { OnboardingQuiz } from '@/components/auth/OnboardingQuiz';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" className="shrink-0" aria-hidden>
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

type Method = 'PHONE' | 'EMAIL';

// ─── Register Page ────────────────────────────────────────────────────────────

export default function RegisterPage() {
  /**
   * Two phases: the onboarding questions, then the account form. The questions
   * are display-only (see OnboardingQuiz) — nothing they answer is sent
   * anywhere, so the account form below is the first real data collection.
   */
  const [phase, setPhase] = useState<'QUIZ' | 'AUTH'>('QUIZ');
  const [method, setMethod] = useState<Method>('PHONE');

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Phone form
  const [phone, setPhone] = useState('+998');
  const [phoneToken, setPhoneToken] = useState<string | null>(null);
  const [botUsername, setBotUsername] = useState<string>('');
  const [isPolling, setIsPolling] = useState(false);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const { register, googleLogin, needsUsername, setTokensAndUser } = useAuth();
  const router = useRouter();
  const prevNeedsUsername = useRef(needsUsername);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!prevNeedsUsername.current && needsUsername) {
      setShowModal(true);
    }
    prevNeedsUsername.current = needsUsername;
  }, [needsUsername]);

  useEffect(() => {
    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, []);

  const startPolling = (token: string) => {
    setIsPolling(true);
    pollingInterval.current = setInterval(async () => {
      try {
        const res = await api.get(`/auth/phone/status/${token}`);
        if (res.data.status === 'VERIFIED') {
          if (pollingInterval.current) clearInterval(pollingInterval.current);
          setIsPolling(false);
          /**
           * The Telegram bot already asked for the username and password
           * before it created the account, so this path never opens the
           * username modal — the server sends isNewUser = false for exactly
           * that reason. Asking again on the web was the duplicate step.
           */
          setTokensAndUser(res.data.accessToken, res.data.user, false);
          router.push('/');
        }
      } catch (err: any) {
        if (err.response?.status === 400 || err.response?.status === 404) {
          if (pollingInterval.current) clearInterval(pollingInterval.current);
          setIsPolling(false);
          setError(err.response?.data?.error || 'Xatolik yuz berdi');
          setPhoneToken(null);
        }
      }
    }, 3000);
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const checkRes = await api.post('/auth/phone/check', { phone });
      if (checkRes.data.exists) {
        setError("Ushbu telefon raqam allaqachon ro'yxatdan o'tgan! Tizimga kirish sahifasiga o'ting.");
        return;
      }

      const { data } = await api.post('/auth/phone/start', { phone });
      setPhoneToken(data.token);
      setBotUsername(data.botUsername);
      startPolling(data.token);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Xatolik yuz berdi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await register(username, email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.error || "Hisob yaratib bo'lmadi. Iltimos, qaytadan urinib ko'ring.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      setError('');
      try {
        /**
         * A brand-new Google account gets a placeholder username server-side,
         * so the modal that asks for a real one is not optional here — it is
         * the rest of the signup.
         */
        const isNewUser = await googleLogin(undefined, tokenResponse.access_token);
        if (isNewUser) {
          setShowModal(true);
        } else {
          router.push('/');
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Google bilan kirishda xato yuz berdi.');
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      setError('Google bilan kirishda xato yuz berdi.');
      setGoogleLoading(false);
    },
  });

  const handleModalClose = () => {
    setShowModal(false);
    router.push('/');
  };

  // ── Phase 1: onboarding questions ────────────────────────────────────────
  if (phase === 'QUIZ') {
    return (
      <AuthScreen>
        <OnboardingQuiz
          onFinish={() => setPhase('AUTH')}
          onSkip={() => setPhase('AUTH')}
        />
      </AuthScreen>
    );
  }

  // ── Phase 2: create the account ──────────────────────────────────────────
  return (
    <>
      <AuthScreen>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Header */}
          <div className="text-center mb-7">
            <div className="w-14 h-14 bg-primary/15 rounded-2xl flex items-center justify-center
                            mx-auto mb-4 border border-primary/25 shadow-glow-sm">
              <span className="text-2xl">🎌</span>
            </div>
            <h1 className="text-2xl font-black text-text-primary tracking-tight mb-2">
              {'Oxirgi qadam — hisob yaratish'}
            </h1>
            <p className="text-text-muted text-sm max-w-xs mx-auto">
              {"Bir daqiqa vaqt oladi. Shundan keyin birinchi so'zlaringizni tanlaysiz."}
            </p>
          </div>

          <div className="card-glass p-6 sm:p-7 border-border/70">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-5 p-4 bg-danger/10 border border-danger/30 rounded-xl flex items-start gap-3 text-danger"
              >
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </motion.div>
            )}

            {/* Google — the fastest route, so it sits first */}
            <button
              type="button"
              id="google-signup-btn"
              onClick={() => { setGoogleLoading(true); handleGoogleLogin(); }}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-xl
                         border border-border bg-surface-2/60 hover:bg-surface-2
                         hover:border-primary/40 transition-all duration-200
                         disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99]"
            >
              {googleLoading ? (
                <Loader2 className="animate-spin text-text-muted" size={20} />
              ) : (
                <GoogleIcon />
              )}
              <span className="text-sm font-bold text-text-primary">
                {googleLoading ? 'Yuklanmoqda...' : "Google bilan davom etish"}
              </span>
            </button>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-text-muted text-xs">yoki</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Method switch */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-surface-2/60 border border-border/60 mb-6">
              {([
                { id: 'PHONE' as Method, label: 'Telefon', icon: Phone },
                { id: 'EMAIL' as Method, label: 'Email', icon: Mail },
              ]).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => { setMethod(id); setError(''); }}
                  className={cn(
                    'flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all',
                    method === id
                      ? 'bg-surface text-text-primary shadow-glass border border-border/60'
                      : 'text-text-muted hover:text-text-secondary',
                  )}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>

            {method === 'PHONE' ? (
              !phoneToken ? (
                <form onSubmit={handlePhoneSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text-secondary pl-1">Telefon raqam</label>
                    <div className="relative group">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" size={18} />
                      <input
                        id="register-phone"
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="input-field pl-10 py-3"
                        placeholder="+998 90 123 45 67"
                      />
                    </div>
                    {/* Username and password are collected by the Telegram bot
                        on this route, so the web form asks for neither. */}
                    <p className="text-xs text-text-muted pl-1 pt-1 flex items-start gap-1.5">
                      <Send size={12} className="shrink-0 mt-0.5" />
                      {"Foydalanuvchi nomi va parolni Telegram botning o'zi so'raydi."}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 group"
                  >
                    {isLoading ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        {"Telegram orqali davom etish"}
                        <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="space-y-5 text-center">
                  <div className="p-4 bg-primary/8 rounded-xl border border-primary/20">
                    <p className="text-xs text-text-muted mb-1">Raqamingiz</p>
                    <p className="text-xl font-black tracking-wider text-text-primary">{phone}</p>
                  </div>

                  <ol className="text-left space-y-2.5 text-sm text-text-secondary">
                    {[
                      'Telegram botni oching',
                      "Raqamingizni tasdiqlang",
                      "Botda username va parol tanlang",
                    ].map((t, i) => (
                      <li key={t} className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-surface-2 border border-border/60
                                         text-[10px] font-black text-text-muted flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {t}
                      </li>
                    ))}
                  </ol>

                  <a
                    href={`https://t.me/${botUsername}?start=${phoneToken}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 group"
                  >
                    <Send size={18} />
                    {"Telegramga o'tish"}
                  </a>

                  {isPolling && (
                    <div className="flex items-center justify-center gap-2 text-sm text-text-muted">
                      <Loader2 className="animate-spin" size={16} />
                      {'Botdagi tasdiq kutilmoqda...'}
                    </div>
                  )}

                  <button
                    onClick={() => setPhoneToken(null)}
                    className="text-xs text-text-muted hover:text-primary transition-colors block mx-auto"
                  >
                    {"Raqamni o'zgartirish"}
                  </button>
                </div>
              )
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-secondary pl-1">{'Foydalanuvchi nomi'}</label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" size={18} />
                    <input
                      id="register-username"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="input-field pl-10 py-3"
                      placeholder="ninja"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-secondary pl-1">Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" size={18} />
                    <input
                      id="register-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field pl-10 py-3"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-secondary pl-1">{'Parol'}</label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" size={18} />
                    <input
                      id="register-password"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field pl-10 py-3"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  id="register-submit-btn"
                  disabled={isLoading}
                  className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 group"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      {'Hisob yaratish'}
                      <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Reassurance + login link */}
          <div className="mt-6 space-y-3 text-center">
            <p className="text-[11px] text-text-muted inline-flex items-center gap-1.5">
              <ShieldCheck size={13} />
              {"Karta so'ralmaydi · Takrorlash bepul"}
            </p>
            <p className="text-sm text-text-muted">
              {'Hisobingiz bormi?'}{' '}
              <Link href="/auth/login" className="text-primary font-bold hover:text-primary-hover transition-colors">
                {'Kirish'}
              </Link>
            </p>
          </div>

          <button
            onClick={() => setPhase('QUIZ')}
            className="mx-auto mt-6 flex items-center gap-1.5 text-xs text-text-muted
                       hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={13} /> {'Savollarga qaytish'}
          </button>
        </motion.div>
      </AuthScreen>

      <AnimatePresence>
        {showModal && <SetupProfileModal onClose={handleModalClose} />}
      </AnimatePresence>
    </>
  );
}

// ─── Shared shell ─────────────────────────────────────────────────────────────

/** Centered, distraction-free frame shared by both phases. */
function AuthScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 py-12">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10" aria-hidden="true">
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-primary/12 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px]" />
      </div>

      <Link href="/" className="flex items-center gap-2 mb-8 group">
        <span className="text-xl">🎌</span>
        <span className="font-black text-text-primary group-hover:text-primary transition-colors">
          {'Bosh sahifa'}
        </span>
      </Link>

      {children}
    </div>
  );
}
