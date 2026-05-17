import { Request, Response } from 'express';
import { z } from 'zod';
import {
  registerUser,
  loginUser,
  refreshTokens,
  getMe,
} from '../services/auth.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error.middleware';

// ─── Validation Schemas ───────────────────────────────────────────────────────

const RegisterSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long'),
});

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ─── Cookie Helper ────────────────────────────────────────────────────────────

const setRefreshCookie = (res: Response, token: string): void => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth',
  });
};

// ─── Controllers ─────────────────────────────────────────────────────────────

export const register = async (req: Request, res: Response): Promise<void> => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message });
    return;
  }

  const { user, tokens } = await registerUser(parsed.data);
  setRefreshCookie(res, tokens.refreshToken);

  res.status(201).json({
    message: 'Registration successful',
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user,
  });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message });
    return;
  }

  const { user, tokens } = await loginUser(parsed.data);
  setRefreshCookie(res, tokens.refreshToken);

  res.json({
    message: 'Login successful',
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user,
  });
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  // Accept refresh token from cookies (web) or request body (mobile)
  const token = (req.cookies?.refreshToken as string | undefined)
    ?? (req.body?.refreshToken as string | undefined);
  if (!token) {
    throw createError('Refresh token not found', 401);
  }

  const tokens = await refreshTokens(token);
  setRefreshCookie(res, tokens.refreshToken);

  res.json({ accessToken: tokens.accessToken });
};

export const logout = (_req: Request, res: Response): void => {
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.json({ message: 'Logged out successfully' });
};

export const me = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    throw createError('Unauthorized', 401);
  }
  const user = await getMe(req.user.id);
  res.json({ user });
};
