import rateLimit from 'express-rate-limit';

const isProduction = process.env.NODE_ENV === 'production';

/** Development needs generous limits so hot-reload loops don't lock you out. */
const perEnv = (prod: number, dev: number) => (isProduction ? prod : dev);

/**
 * Credential-checking routes (login, register, password/phone entry).
 * Deliberately tight — this is the brute-force surface.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  max: perEnv(20, 1000),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Juda ko'p urinishlar! Iltimos, 15 daqiqadan so'ng qayta urinib ko'ring.",
  },
});

/**
 * Telegram phone-auth status polling.
 *
 * The login screen polls every 3 seconds for up to 5 minutes (the AuthSession
 * lifetime) — that is ~100 requests for a single successful sign-in, so the
 * strict authLimiter above would lock the user out mid-flow.
 */
export const pollingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: perEnv(400, 5000),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Juda ko'p so'rov. Iltimos, sahifani yangilab qayta urinib ko'ring." },
});

/**
 * Token refresh — called on every page load and whenever an access token
 * expires (every 15 minutes per active session), so it needs more headroom
 * than sign-in but should still be bounded.
 */
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: perEnv(100, 2000),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many refresh attempts, please sign in again.' },
});

/** Umumiy API uchun yengilroq limit. */
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 daqiqa
  max: perEnv(100, 1000),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "So'rovlar limiti tugadi! Iltimos biroz kuting." },
});
