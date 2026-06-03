'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, googleLogin, needsUsername } = useAuth();
  const router = useRouter();

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) return;
    setGoogleLoading(true);
    setError('');
    try {
      await googleLogin(credentialResponse.credential);
      // needsUsername ni context kuzatadi, redirect kerak emas
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Google bilan kirishda xato yuz berdi.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      router.push('/'); // Redirect to dashboard
    } catch (err: any) {
      setError(err.response?.data?.error || 'Kirish muvaffaqiyatsiz tugadi. Iltimos, ma\'lumotlaringizni tekshiring.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background ambient effects */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px] mix-blend-screen" />
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
            <span className="text-3xl">🎌</span>
          </motion.div>
          <h1 className="text-2xl font-extrabold text-text-primary mb-2">Xush kelibsiz</h1>
          <p className="text-text-muted text-sm">{"Lug'at boyligingizni oshirishda davom etish uchun tizimga kiring"}</p>
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
            <label className="text-sm font-medium text-text-secondary pl-1">Email</label>
            <div className="relative group">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" size={18} />
              <input
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
            <label className="text-sm font-medium text-text-secondary pl-1">Parol</label>
            <div className="relative group">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pl-10 py-3"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 mt-2 group shadow-glow-md"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                Tizimga kirish
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

        {/* Google Login */}
        <div className="flex justify-center">
          {googleLoading ? (
            <div className="flex items-center gap-2 text-text-muted text-sm">
              <Loader2 className="animate-spin" size={18} />
              Google bilan kirilmoqda...
            </div>
          ) : (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google bilan kirishda xato yuz berdi.')}
              text="signin_with"
              shape="rectangular"
              theme="filled_black"
              size="large"
              width="360"
            />
          )}
        </div>

        <p className="text-center text-sm text-text-muted mt-8">
          {"Hisobingiz yo'qmi?"}{' '}
          <Link href="/auth/register" className="text-primary font-semibold hover:text-primary-light transition-colors">
            {"Ro'yxatdan o'tish"}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
