import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { errorHandler } from './middleware/error.middleware';
import authRoutes from './routes/auth.routes';
import healthRoutes from './routes/health.routes';
import vocabularyRoutes from './routes/vocabulary.routes';
import gameRoutes from './routes/game.routes';
import adminRoutes from './routes/admin.routes';
import utilityRoutes from './routes/utility.routes';
import libraryRoutes from './routes/library.routes';
import communityRoutes from './routes/community.routes';
import premiumRoutes from './routes/premium.routes';
import jlptRoutes from './routes/jlpt.routes';
import { getLeaderboardHandler } from './controllers/game.controller';

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// ─── Proxy Awareness ──────────────────────────────────────────────────────────
// Behind nginx, req.ip is the proxy's address unless Express is told to trust
// the X-Forwarded-For header. Without this, express-rate-limit buckets EVERY
// visitor together and the auth limit is exhausted site-wide by a few users.
// TRUST_PROXY=1 means "trust exactly one hop" (nginx) — never use `true`, which
// lets a client spoof its own IP through the header.
const trustProxy = process.env.TRUST_PROXY ?? (isProduction ? '1' : '');
if (trustProxy) {
  const numericHops = Number(trustProxy);
  app.set('trust proxy', Number.isNaN(numericHops) ? trustProxy : numericHops);
}

// ─── Security & Core Middleware ───────────────────────────────────────────────
app.use(helmet());

/**
 * Origins are matched on the parsed hostname, never with `includes()`.
 * A substring check would let `https://ngrok-free.app.attacker.com` through.
 *
 * FRONTEND_URL may hold several comma-separated origins.
 */
const staticOrigins = new Set(
  (process.env.FRONTEND_URL ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
);

/** Dev-tunnel hosts allowed as an exact host or as a `*.domain` subdomain. */
const TUNNEL_DOMAINS = ['ngrok-free.app', 'ngrok-free.dev', 'ngrok.io', 'ngrok.app'];

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '10.0.2.2']);

export const isOriginAllowed = (origin: string): boolean => {
  if (staticOrigins.has(origin)) return true;

  let hostname: string;
  let protocol: string;
  try {
    const url = new URL(origin);
    hostname = url.hostname.toLowerCase();
    protocol = url.protocol;
  } catch {
    return false; // Malformed Origin header
  }

  if (protocol !== 'http:' && protocol !== 'https:') return false;

  // Local development hosts (any port)
  if (LOCAL_HOSTNAMES.has(hostname)) return true;

  // Tunnel domains: exact match or a direct subdomain — nothing else.
  return TUNNEL_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
  );
};

app.use(
  cors({
    origin: (origin, callback) => {
      // No Origin header — native mobile apps, curl, server-to-server.
      if (!origin) {
        callback(null, true);
        return;
      }

      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }),
);
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Global Rate Limiter ─────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 1000 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// NOTE: auth routes are NOT wrapped in a blanket limiter here. Sign-in attempts
// and the Telegram status-polling endpoint need very different budgets, so each
// auth route picks its own limiter in routes/auth.routes.ts.

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', vocabularyRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/premium', premiumRoutes);
app.use('/api/jlpt', jlptRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', utilityRoutes);
app.get('/api/leaderboard', getLeaderboardHandler);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
