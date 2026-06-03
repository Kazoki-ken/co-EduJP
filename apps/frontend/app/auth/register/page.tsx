'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useGoogleLogin } from '@react-oauth/google';
import { Mail, Lock, User, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import SetupProfileModal from '@/components/auth/SetupProfileModal';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" className="shrink-0" aria-hidden>
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

// ─── Register Page ────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { register, googleLogin, needsUsername } = useAuth();
  const router = useRouter();
  const prevNeedsUsername = useRef(needsUsername);

  useEffect(() => {
    if (!prevNeedsUsername.current && needsUsername) {
      setShowModal(true);
    }
    prevNeedsUsername.current = needsUsername;
  }, [needsUsername]);

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      setError('');
      try {
        await googleLogin(undefined, tokenResponse.access_token);
        if (!needsUsername) {
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

  const handleSubmit = async (e: React.FormEvent) => {
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

  const handleModalClose = () => {
    setShowModal(false);
    router.push('/');
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="fixed inset-0 pointer-events-none -z-10">
          <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen animate-pulse-glow" />
          <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-success/10 rounded-full blur-[100px] mix-blend-screen" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md card-glass p-8"
        >
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', bounce: 0.5 }}
              className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/30 shadow-glow-sm"
            >
              <span className="text-3xl">🚀</span>
            </motion.div>
            <h1 className="text-2xl font-extrabold text-text-primary mb-2">{"Hisob yaratish"}</h1>
            <p className="text-text-muted text-sm">{"Bugundan boshlab yapon tili so'zlarini o'zlashtirishni boshlang"}</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-6 p-4 bg-danger/10 border border-danger/30 rounded-xl flex items-start gap-3 text-danger"
            >
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-secondary pl-1">{"Foydalanuvchi nomi"}</label>
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
              <label className="text-sm font-medium text-text-secondary pl-1">{"Parol"}</label>
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
              className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 mt-2 group shadow-glow-md"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  {"Hisob yaratish"}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-text-muted text-xs">yoki</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Custom Glass Google Button */}
          <motion.button
            type="button"
            id="google-signup-btn"
            onClick={() => { setGoogleLoading(true); handleGoogleLogin(); }}
            disabled={googleLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-xl border transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden group"
            style={{
              background: 'rgba(255,255,255,0.05)',
              borderColor: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              style={{ background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.12) 0%, transparent 70%)' }}
            />
            <motion.div
              className="absolute inset-0 rounded-xl pointer-events-none"
              whileHover={{ boxShadow: '0 0 0 1px rgba(124,58,237,0.5), 0 0 24px rgba(124,58,237,0.15)' }}
              transition={{ duration: 0.2 }}
            />
            {googleLoading ? (
              <Loader2 className="animate-spin text-text-muted relative z-10" size={20} />
            ) : (
              <span className="relative z-10"><GoogleIcon /></span>
            )}
            <span className="text-sm font-semibold text-text-secondary group-hover:text-text-primary transition-colors relative z-10">
              {googleLoading ? 'Yuklanmoqda...' : "Google bilan ro'yxatdan o'tish"}
            </span>
          </motion.button>

          <p className="text-center text-sm text-text-muted mt-8">
            {"Hisobingiz bormi?"}{' '}
            <Link href="/auth/login" className="text-primary font-semibold hover:text-primary-light transition-colors">
              {"Kirish"}
            </Link>
          </p>
        </motion.div>
      </div>

      <AnimatePresence>
        {showModal && <SetupProfileModal onClose={handleModalClose} />}
      </AnimatePresence>
    </>
  );
}
