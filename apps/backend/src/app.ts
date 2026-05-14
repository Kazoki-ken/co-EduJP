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
import { getLeaderboardHandler } from './controllers/game.controller';

const app = express();

// ─── Security & Core Middleware ───────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
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
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Stricter limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 1000 : 20, // Higher limit for dev
  message: { error: 'Too many authentication attempts, please try again later.' },
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/health', healthRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api', vocabularyRoutes);
app.use('/api/games', gameRoutes);
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
