import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../lib/prisma';
import { createError } from '../middleware/error.middleware';
import { updateStreakOnLogin, syncStreakAndDailyCounts } from './streak.service';

interface RegisterDto {
  username: string;
  email: string;
  password: string;
}

interface LoginDto {
  email: string;
  password: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ─── Token Helpers ────────────────────────────────────────────────────────────

export const signTokens = (payload: {
  id: string;
  email: string;
  username: string;
  role: string;
}): TokenPair => {
  const accessSecret = process.env.JWT_ACCESS_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!accessSecret || !refreshSecret) {
    throw new Error('JWT secrets are not configured');
  }

  const accessToken = jwt.sign(payload, accessSecret, {
    expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as jwt.SignOptions['expiresIn'],
  });

  const refreshToken = jwt.sign({ id: payload.id }, refreshSecret, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'],
  });

  return { accessToken, refreshToken };
};

export const verifyRefreshToken = (
  token: string,
): { id: string } => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET not configured');
  return jwt.verify(token, secret) as { id: string };
};

// ─── Auth Service Methods ─────────────────────────────────────────────────────

export const registerUser = async (dto: RegisterDto) => {
  const existingEmail = await prisma.user.findUnique({
    where: { email: dto.email.toLowerCase() },
  });
  if (existingEmail) {
    throw createError('Email already in use', 409);
  }

  const existingUsername = await prisma.user.findUnique({
    where: { username: dto.username },
  });
  if (existingUsername) {
    throw createError('Username already taken', 409);
  }

  const passwordHash = await bcrypt.hash(dto.password, 12);

  const user = await prisma.user.create({
    data: {
      username: dto.username,
      email: dto.email.toLowerCase(),
      passwordHash,
      profile: {
        create: {
          streak: 0,
          lastLoginDate: new Date(),
        },
      },
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
      profile: true,
      _count: {
        select: {
          savedWords: true,
          badges: true,
        },
      },
    },
  });

  const tokens = signTokens({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
  });

  return { user, tokens };
};

export const loginUser = async (dto: LoginDto, timezoneOffset: number = 0) => {
  const user = await prisma.user.findUnique({
    where: { email: dto.email.toLowerCase() },
    include: { 
      profile: true,
      _count: {
        select: {
          savedWords: true,
          badges: true,
        },
      },
    },
  });

  if (!user) {
    throw createError('Invalid email or password', 401);
  }

  if (!user.passwordHash) {
    throw createError('Bu hisob Google orqali yaratilgan. Google bilan kiring.', 401);
  }

  const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
  if (!isPasswordValid) {
    throw createError('Invalid email or password', 401);
  }


  // Update streak and daily reset
  const updatedProfile = await updateStreakOnLogin(user.id, user.profile, timezoneOffset);

  const tokens = signTokens({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
  });

  const { passwordHash: _, ...safeUser } = user;

  return {
    user: { ...safeUser, profile: updatedProfile },
    tokens,
  };
};

export const refreshTokens = async (refreshToken: string): Promise<TokenPair> => {
  let payload: { id: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw createError('Invalid or expired refresh token', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, email: true, username: true, role: true },
  });

  if (!user) {
    throw createError('User not found', 401);
  }

  return signTokens(user);
};

export const getMe = async (userId: string, timezoneOffset: number = 0) => {
  // Sync streak and reset daily counts if needed
  await syncStreakAndDailyCounts(userId, timezoneOffset);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
      profile: true,
      avatarUrl: true,
      _count: {
        select: {
          savedWords: true,
          badges: true,
        },
      },
    },
  });

  if (!user) throw createError('User not found', 404);
  return user;
};

// ─── Google OAuth ─────────────────────────────────────────────────────────────

const googleClient = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);

export const googleAuth = async (idToken: string) => {
  // 1. Google serverlarida tokenni tekshirish
  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_WEB_CLIENT_ID,
    });
  } catch {
    throw createError('Invalid Google token', 401);
  }

  const payload = ticket.getPayload();
  if (!payload) throw createError('Google token payload is empty', 401);

  const { sub: googleId, email, name, picture } = payload;

  if (!email) throw createError('Google account has no email', 400);

  // 2. Mavjud foydalanuvchini topish (google ID yoki email orqali)
  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId }, { email: email.toLowerCase() }] },
    include: {
      profile: true,
      _count: { select: { savedWords: true, badges: true } },
    },
  });

  let isNewUser = false;

  if (!user) {
    // 3. Yangi foydalanuvchi yaratish (username keyinroq o'rnatiladi)
    isNewUser = true;
    const tempUsername = `user_${googleId.slice(0, 8)}`; // vaqtinchalik username

    user = await prisma.user.create({
      data: {
        username: tempUsername,
        email: email.toLowerCase(),
        googleId,
        avatarUrl: picture ?? null,
        profile: {
          create: {
            streak: 0,
            lastLoginDate: new Date(),
          },
        },
      },
      include: {
        profile: true,
        _count: { select: { savedWords: true, badges: true } },
      },
    });
  } else if (!user.googleId) {
    // 4. Email orqali topildi — Google ID ni bog'lash
    user = await prisma.user.update({
      where: { id: user.id },
      data: { googleId, avatarUrl: picture ?? user.avatarUrl },
      include: {
        profile: true,
        _count: { select: { savedWords: true, badges: true } },
      },
    });
  }

  // 5. Streak yangilash
  if (user.profile) {
    await updateStreakOnLogin(user.id, user.profile, 0);
  }

  const tokens = signTokens({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
  });

  const { passwordHash: _, ...safeUser } = user as typeof user & { passwordHash?: string };

  return { user: safeUser, tokens, isNewUser };
};

// ─── Set Username (social login yangi foydalanuvchilar uchun) ─────────────────

export const setUsernameService = async (userId: string, username: string) => {
  // Username mavjudligini tekshirish
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing && existing.id !== userId) {
    throw createError('Username already taken', 409);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { username },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
      avatarUrl: true,
      profile: true,
      _count: { select: { savedWords: true, badges: true } },
    },
  });

  return user;
};

