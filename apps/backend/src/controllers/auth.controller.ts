import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  registerUser,
  loginUser,
  refreshTokens,
  getMe,
  googleAuth,
  setUsernameService,
  setPasswordService,
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

  const timezoneOffset = req.headers['x-timezone-offset']
    ? parseInt(req.headers['x-timezone-offset'] as string, 10)
    : 0;

  const { user, tokens } = await loginUser(parsed.data, timezoneOffset);
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
  const timezoneOffset = req.headers['x-timezone-offset']
    ? parseInt(req.headers['x-timezone-offset'] as string, 10)
    : 0;
  const user = await getMe(req.user.id, timezoneOffset);
  res.json({ user });
};

// ─── Google OAuth Controller ───────────────────────────────────────────

const GoogleLoginSchema = z.object({
  idToken: z.string().min(1, 'idToken is required'),
});

export const googleLogin = async (req: Request, res: Response): Promise<void> => {
  const parsed = GoogleLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message });
    return;
  }

  const { user, tokens, isNewUser } = await googleAuth(parsed.data.idToken);
  setRefreshCookie(res, tokens.refreshToken);

  res.status(isNewUser ? 201 : 200).json({
    message: isNewUser ? 'Account created via Google' : 'Login successful via Google',
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    isNewUser, // frontend bu flag orqali UsernameSetup ekraniga o'tadi
    user,
  });
};

// ─── Set Username Controller (social login, birinchi kirish) ─────────────

const SetUsernameSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
});

export const setUsername = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  if (!req.user) throw createError('Unauthorized', 401);

  const parsed = SetUsernameSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message });
    return;
  }

  const user = await setUsernameService(req.user.id, parsed.data.username);
  res.json({ message: 'Username updated successfully', user });
};

// ─── Set Password Controller (Google login users) ────────────────────────

const SetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long'),
});

export const setPassword = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (!req.user) throw createError('Unauthorized', 401);

  const parsed = SetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message });
    return;
  }

  const user = await setPasswordService(req.user.id, parsed.data.password);
  res.json({ message: 'Password set successfully', user });
};
