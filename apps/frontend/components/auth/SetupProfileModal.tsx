'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, ArrowRight, Loader2, CheckCircle2, Eye, EyeOff, AlertCircle, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

// ─── Animated Step Indicator ──────────────────────────────────────────────────

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      {/* Step 1 */}
      <div className="flex items-center gap-2">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
            step >= 1
              ? 'bg-primary text-white shadow-glow-sm'
              : 'bg-white/10 text-text-muted'
          }`}
        >
          {step > 1 ? <CheckCircle2 size={16} /> : '1'}
        </div>
        <span className={`text-xs font-medium hidden sm:block ${step >= 1 ? 'text-text-secondary' : 'text-text-muted'}`}>
          Username
        </span>
      </div>

      {/* Connector */}
      <div className="flex-1 h-px relative overflow-hidden max-w-[60px]">
        <div className="absolute inset-0 bg-white/10" />
        <motion.div
          className="absolute inset-0 bg-primary"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: step > 1 ? 1 : 0 }}
          transition={{ duration: 0.4 }}
          style={{ transformOrigin: 'left' }}
        />
      </div>

      {/* Step 2 */}
      <div className="flex items-center gap-2">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
            step >= 2
              ? 'bg-primary text-white shadow-glow-sm'
              : 'bg-white/10 text-text-muted'
          }`}
        >
          2
        </div>
        <span className={`text-xs font-medium hidden sm:block ${step >= 2 ? 'text-text-secondary' : 'text-text-muted'}`}>
          Parol (ixtiyoriy)
        </span>
      </div>
    </div>
  );
}

// ─── Step 1: Username Setup ───────────────────────────────────────────────────

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
              Davom etish
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
}

// ─── Step 2: Password Setup ───────────────────────────────────────────────────

function PasswordStep({ onDone }: { onDone: () => void }) {
  const { setPassword } = useAuth();
  const [password, setPasswordInput] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirmPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordValid = password.length >= 8;
  const confirmValid = password === confirm && confirm.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordValid) {
      setError("Parol kamida 8 ta belgidan iborat bo'lishi kerak.");
      return;
    }
    if (!confirmValid) {
      setError('Parollar mos kelmadi.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await setPassword(password);
      onDone();
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
          <Lock size={28} className="text-primary" />
        </motion.div>
        <h2 className="text-2xl font-extrabold text-text-primary mb-2">Parol yarating</h2>
        <p className="text-text-muted text-sm">
          Email/parol bilan ham kirish uchun parol o'rnating{' '}
          <span className="text-primary font-medium">(ixtiyoriy)</span>
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
        {/* Password field */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-secondary pl-1">Parol</label>
          <div className="relative group">
            <Lock
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors"
              size={18}
            />
            <input
              type={showPwd ? 'text' : 'password'}
              autoFocus
              value={password}
              onChange={(e) => { setPasswordInput(e.target.value); setError(''); }}
              className="input-field pl-10 pr-10 py-3"
              placeholder="Kamida 8 ta belgi"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
            >
              {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {password.length > 0 && (
            <p className={`text-xs pl-1 ${passwordValid ? 'text-success' : 'text-danger'}`}>
              {passwordValid ? 'Parol yetarli ✓' : 'Parol kamida 8 ta belgi bo\'lishi kerak'}
            </p>
          )}
        </div>

        {/* Confirm field */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-secondary pl-1">Parolni tasdiqlang</label>
          <div className="relative group">
            <Lock
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors"
              size={18}
            />
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(''); }}
              className="input-field pl-10 pr-10 py-3"
              placeholder="Parolni qaytaring"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPwd((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {confirm.length > 0 && (
            <p className={`text-xs pl-1 ${confirmValid ? 'text-success' : 'text-danger'}`}>
              {confirmValid ? 'Parollar mos keldi ✓' : 'Parollar mos kelmadi'}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !passwordValid || !confirmValid}
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

        <button
          type="button"
          onClick={onDone}
          className="w-full py-3 text-sm text-text-muted hover:text-text-secondary transition-colors text-center"
        >
          O'tkazib yuborish — keyinroq o'rnataman
        </button>
      </form>
    </motion.div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function SetupProfileModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);

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
        {/* Step indicator */}
        <StepIndicator step={step} />

        {/* Step label */}
        <p className="text-xs text-text-muted text-right mb-4">
          {step}/2 bosqich
        </p>

        {/* Step content with animations */}
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <UsernameStep key="step1" onNext={() => setStep(2)} />
          ) : (
            <PasswordStep key="step2" onDone={onClose} />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
