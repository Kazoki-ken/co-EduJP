'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ArrowRight, Loader2, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

// ─── Username Setup ───────────────────────────────────────────────────

function UsernameStep({
  onNext,
}: {
  onNext: () => void;
}) {
  const { setUsername, user } = useAuth();
  const [username, setUsernameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isValid = /^[a-zA-Z0-9_]{3,30}$/.test(username.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      setError("Username 3-30 ta harf, raqam yoki _ dan iborat bo'lishi kerak.");
      return;
    }
    setError('');
    setLoading(true);
    try {
      await setUsername(username.trim());
      onNext();
    } catch (err: any) {
      setError(err.response?.data?.error || "Xatolik yuz berdi. Qaytadan urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.35 }}
    >
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }}
          className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/30 shadow-glow-sm"
        >
          <span className="text-3xl">👤</span>
        </motion.div>
        <h2 className="text-2xl font-extrabold text-text-primary mb-2">Username tanlang</h2>
        <p className="text-text-muted text-sm">
          {user?.email ? (
            <>
              <span className="text-primary font-medium">{user.email}</span>{' '}
              uchun noyob username kiriting
            </>
          ) : (
            'Hisobingiz uchun noyob username kiriting'
          )}
        </p>
      </div>

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

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-secondary pl-1">Username</label>
          <div className="relative group">
            <User
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors"
              size={18}
            />
            <input
              type="text"
              autoFocus
              value={username}
              onChange={(e) => { setUsernameInput(e.target.value); setError(''); }}
              className="input-field pl-10 py-3"
              placeholder="masalan: nihongo_fan"
              autoComplete="off"
              autoCapitalize="none"
            />
            {username.length > 0 && (
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                {isValid ? (
                  <CheckCircle2 size={18} className="text-success" />
                ) : (
                  <AlertCircle size={18} className="text-danger" />
                )}
              </div>
            )}
          </div>
          <p className={`text-xs pl-1 transition-colors ${
            username.length === 0 ? 'text-text-muted' : isValid ? 'text-success' : 'text-danger'
          }`}>
            {username.length === 0
              ? '3–30 belgi: harf, raqam yoki _'
              : isValid
              ? "Username to'g'ri formatda ✓"
              : 'Faqat harf, raqam va _ (3–30 belgi)'}
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !isValid}
          className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 group shadow-glow-md disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <>
              Tasdiqlash
              <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform" />
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
}

function PasswordStep({
  onNext,
  onSkip,
}: {
  onNext: () => void;
  onSkip: () => void;
}) {
  const { setPassword } = useAuth();
  const [password, setPasswordInput] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordValid = password.length >= 8;
  const confirmValid = password === confirm && confirm.length > 0;
  const isValid = passwordValid && confirmValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      if (!passwordValid) {
        setError("Parol kamida 8 ta belgidan iborat bo'lishi kerak.");
      } else {
        setError("Parollar mos kelmadi.");
      }
      return;
    }
    setError('');
    setLoading(true);
    try {
      await setPassword(password);
      onNext();
    } catch (err: any) {
      setError(err.response?.data?.error || "Xatolik yuz berdi. Qaytadan urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ duration: 0.35 }}
    >
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }}
          className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/30 shadow-glow-sm"
        >
          <span className="text-3xl">🔒</span>
        </motion.div>
        <h2 className="text-2xl font-extrabold text-text-primary mb-2">Parol o'rnating</h2>
        <p className="text-text-muted text-sm">
          {"Ixtiyoriy — parolsiz ham Google orqali kirib turaverasiz"}
        </p>
      </div>

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

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-secondary pl-1">Parol</label>
          <div className="relative group">
            <Lock
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors"
              size={18}
            />
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => { setPasswordInput(e.target.value); setError(''); }}
              className="input-field pl-10 py-3"
              placeholder="Kamida 8 ta belgi"
              autoComplete="new-password"
            />
            {password.length > 0 && (
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                {passwordValid ? (
                  <CheckCircle2 size={18} className="text-success" />
                ) : (
                  <AlertCircle size={18} className="text-danger" />
                )}
              </div>
            )}
          </div>
          <p className={`text-xs pl-1 transition-colors ${
            password.length === 0 ? 'text-text-muted' : passwordValid ? 'text-success' : 'text-danger'
          }`}>
            {password.length === 0
              ? 'Kamida 8 ta belgi'
              : passwordValid
              ? 'Parol formati toʻgʻri ✓'
              : 'Kamida 8 ta belgi boʻlishi shart'}
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-secondary pl-1">Parolni tasdiqlang</label>
          <div className="relative group">
            <Lock
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors"
              size={18}
            />
            <input
              type="password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(''); }}
              className="input-field pl-10 py-3"
              placeholder="Parolni qayta kiriting"
              autoComplete="new-password"
            />
            {confirm.length > 0 && (
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                {confirmValid ? (
                  <CheckCircle2 size={18} className="text-success" />
                ) : (
                  <AlertCircle size={18} className="text-danger" />
                )}
              </div>
            )}
          </div>
          {confirm.length > 0 && (
            <p className={`text-xs pl-1 transition-colors ${confirmValid ? 'text-success' : 'text-danger'}`}>
              {confirmValid ? 'Parollar mos keldi ✓' : 'Parollar mos kelmadi'}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !isValid}
          className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 group shadow-glow-md disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <>
              Parol saqlash
              <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform" />
            </>
          )}
        </button>

        {/* A Google account already has a working way in, so forcing a second
            credential here only cost signups. */}
        <button
          type="button"
          onClick={onSkip}
          className="block mx-auto text-xs text-text-muted hover:text-primary transition-colors"
        >
          {"Hozircha o'tkazib yuborish"}
        </button>
      </form>
    </motion.div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function SetupProfileModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<'USERNAME' | 'PASSWORD'>('USERNAME');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(12px)', backgroundColor: 'rgba(0,0,0,0.75)' }}
    >
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-accent/10 rounded-full blur-[80px]" />
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', bounce: 0.3 }}
        className="w-full max-w-md card-glass p-8 relative z-10"
      >
        {/* Two dots rather than a bare modal: knowing there is exactly one more
            screen is the difference between finishing and closing the tab. */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {(['USERNAME', 'PASSWORD'] as const).map((s) => (
            <span
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === s ? 'w-7 bg-primary' : 'w-1.5 bg-border'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 'USERNAME' ? (
            <UsernameStep key="step1" onNext={() => setStep('PASSWORD')} />
          ) : (
            <PasswordStep key="step2" onNext={onClose} onSkip={onClose} />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
