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
  email: string | null;
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

export const googleAuth = async (idToken?: string, accessToken?: string) => {
  let googleId: string;
  let email: string | undefined;
  let name: string | undefined;
  let picture: string | undefined;

  if (idToken) {
    // Mobile flow — verify idToken with google-auth-library
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
    googleId = payload.sub;
    email = payload.email;
    name = payload.name;
    picture = payload.picture;
  } else if (accessToken) {
    // Web flow — fetch userinfo from Google API
    try {
      const res = await fetch(
        `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`,
      );
      if (!res.ok) throw new Error('Failed to fetch user info');
      const info = await res.json() as { sub: string; email: string; name?: string; picture?: string };
      googleId = info.sub;
      email = info.email;
      name = info.name;
      picture = info.picture;
    } catch {
      throw createError('Invalid Google access token', 401);
    }
  } else {
    throw createError('Google token required', 400);
  }

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

export const setPasswordService = async (userId: string, password: string) => {
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
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

// ─── Google Login Only (yangi hisob yaratilmaydi) ────────────────────────────
// Card game kabi ikkilamchi ilovalar uchun: faqat mavjud foydalanuvchilar kira oladi

export const googleLoginOnlyService = async (idToken?: string, accessToken?: string) => {
  let googleId: string;
  let email: string | undefined;
  let picture: string | undefined;

  if (idToken) {
    // idToken orqali (native mobile)
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
    googleId = payload.sub;
    email = payload.email;
    picture = payload.picture;
  } else if (accessToken) {
    // accessToken orqali (web/expo)
    try {
      const res = await fetch(
        `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`,
      );
      if (!res.ok) throw new Error('Failed to fetch user info');
      const info = await res.json() as { sub: string; email: string; picture?: string };
      googleId = info.sub;
      email = info.email;
      picture = info.picture;
    } catch {
      throw createError('Invalid Google access token', 401);
    }
  } else {
    throw createError('Google token required', 400);
  }

  if (!email) throw createError('Google account has no email', 400);

  // ⚠️ Faqat mavjud foydalanuvchini qidirish — yangi yaratilmaydi!
  const user = await prisma.user.findFirst({
    where: { OR: [{ googleId }, { email: email.toLowerCase() }] },
    include: {
      profile: true,
      _count: { select: { savedWords: true, badges: true } },
    },
  });

  if (!user) {
    // Foydalanuvchi bazada yo'q — kirish taqiqlanadi
    throw createError(
      "Siz VocabJP ilovasida ro'yxatdan o'tmagansiz. Iltimos, avval edujp.uz saytida ro'yxatdan o'ting.",
      403,
    );
  }

  // Google ID ni bog'lash (agar email orqali topilgan bo'lsa)
  if (!user.googleId) {
    await prisma.user.update({
      where: { id: user.id },
      data: { googleId, avatarUrl: picture ?? user.avatarUrl },
    });
  }

  // Streak yangilash
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
  return { user: safeUser, tokens };
};

// ─── Telegram Phone Auth ──────────────────────────────────────────────────────

import crypto from 'crypto';

export const startPhoneAuthService = async (phone: string) => {
  // 1. Tozalanadi
  const cleanPhone = phone.replace(/\D/g, '');
  if (!cleanPhone.startsWith('998') || cleanPhone.length !== 12) {
    throw createError("Faqat +998 bilan boshlanuvchi O'zbekiston raqamlari qabul qilinadi", 400);
  }

  // 2. Token generatsiya qilish (5 xonali oson kod yoki havola uchun)
  const token = crypto.randomInt(10000, 99999).toString();

  // 3. Bazaga saqlash
  const session = await prisma.authSession.create({
    data: {
      token,
      phone: `+${cleanPhone}`,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 daqiqa
    },
  });

  return session;
};

export const checkPhoneAuthStatusService = async (token: string) => {
  const session = await prisma.authSession.findUnique({
    where: { token },
  });

  if (!session) {
    throw createError("Sessiya topilmadi", 404);
  }

  if (session.status === 'EXPIRED' || new Date() > session.expiresAt) {
    await prisma.authSession.update({ where: { id: session.id }, data: { status: 'EXPIRED' } });
    throw createError("Sessiya vaqti tugagan. Qaytadan raqam kiriting.", 400);
  }

  if (session.status === 'PENDING') {
    return { status: 'PENDING' }; // Hali botda tasdiqlamagan
  }

  if (session.status === 'VERIFIED') {
    // Tasdiqlangan! Endi User yaratamiz yoki mavjudini topamiz.
    let user = await prisma.user.findUnique({
      where: { phone: session.phone },
      include: {
        profile: true,
        _count: { select: { savedWords: true, badges: true } },
      },
    });

    let isNewUser = false;

    if (!user) {
      // Yangi foydalanuvchi!
      isNewUser = true;
      const tempUsername = `user_${session.telegramId?.slice(0, 8) || token}`;
      user = await prisma.user.create({
        data: {
          username: tempUsername,
          phone: session.phone,
          telegramId: session.telegramId,
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
    } else {
      // Mavjud foydalanuvchi - telegram id ni yangilaymiz agar yo'q bo'lsa
      if (!user.telegramId && session.telegramId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { telegramId: session.telegramId },
          include: {
            profile: true,
            _count: { select: { savedWords: true, badges: true } },
          },
        });
      }
    }

    // Streak yangilash
    if (user.profile) {
      await updateStreakOnLogin(user.id, user.profile, 0);
    }

    const tokens = signTokens({
      id: user.id,
      email: user.email || '',
      username: user.username,
      role: user.role,
    });

    // Sessiyani o'chirib yuboramiz (qayta ishlatilmasligi uchun)
    await prisma.authSession.delete({ where: { id: session.id } });

    const { passwordHash: _, ...safeUser } = user as typeof user & { passwordHash?: string };
    return { status: 'VERIFIED', user: safeUser, tokens, isNewUser };
  }

  throw createError("Noma'lum holat", 500);
};


