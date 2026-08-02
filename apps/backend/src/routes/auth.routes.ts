import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  me,
  googleLogin,
  googleLoginOnly,
  setUsername,
  setPassword,
  startPhoneAuth,
  checkPhoneAuthStatus,
  checkPhoneExists,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import {
  authLimiter,
  pollingLimiter,
  refreshLimiter,
} from '../middleware/rateLimiter.middleware';

const router = Router();

/**
 * POST /api/auth/register
 * Create a new user account
 */
router.post('/register', authLimiter, register);

/**
 * POST /api/auth/login
 * Login and receive access + refresh tokens
 */
router.post('/login', authLimiter, login);

/**
 * POST /api/auth/refresh
 * Exchange refresh token (httpOnly cookie or request body) for a new access token
 */
router.post('/refresh', refreshLimiter, refresh);

/**
 * POST /api/auth/logout
 * Revoke the refresh token and clear the cookie
 */
router.post('/logout', logout);

/**
 * GET /api/auth/me
 * Get current authenticated user profile
 */
router.get('/me', authenticate, me);

/**
 * POST /api/auth/google
 * Sign in or register with Google OAuth (main app)
 */
router.post('/google', authLimiter, googleLogin);

/**
 * POST /api/auth/google-login-only
 * Sign in with Google — ONLY for existing VocabJP users (no registration)
 * Used by secondary apps like VocabCards
 */
router.post('/google-login-only', authLimiter, googleLoginOnly);

/**
 * PATCH /api/auth/set-username
 * Set username for new social login users (first-time setup)
 */
router.patch('/set-username', authenticate, setUsername);

/**
 * PATCH /api/auth/set-password
 * Set password for social login users (optional, post-setup step)
 */
router.patch('/set-password', authenticate, setPassword);

/**
 * POST /api/auth/phone/start
 * Bepul Telegram bot orqali nomer bilan kirishni boshlash (AuthSession yaratish)
 *
 * POST /api/auth/phone/check
 * Raqam bazada bor-yo'qligini tekshirish
 */
router.post('/phone/start', authLimiter, startPhoneAuth);
router.post('/phone/check', authLimiter, checkPhoneExists);

/**
 * GET /api/auth/phone/status/:token
 * Frontend botdan tasdiqlashni kutadi — har 3 soniyada so'raladi, shuning uchun
 * qat'iy authLimiter emas, yumshoqroq pollingLimiter ishlatiladi.
 */
router.get('/phone/status/:token', pollingLimiter, checkPhoneAuthStatus);

export default router;
