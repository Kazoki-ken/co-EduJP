import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../lib/prisma';
import { createError } from '../middleware/error.middleware';
import { updateStreakOnLogin, syncStreakAndDailyCounts } from './streak.service';
import { getEntitlements } from './entitlement.service';

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

  // `jti` gives every refresh token a unique payload. Without it, two tokens
  // signed for the same user inside the same second are byte-identical (iat has
  // one-second resolution), so rotating right after sign-in produced a
  // duplicate token_hash and the refresh request failed.
  const refreshToken = jwt.sign(
    { id: payload.id, jti: crypto.randomUUID() },
    refreshSecret,
    {
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'],
    },
  );

  return { accessToken, refreshToken };
};

export const verifyRefreshToken = (
  token: string,
): { id: string; jti?: string; exp?: number } => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET not configured');
  return jwt.verify(token, secret) as { id: string; jti?: string; exp?: number };
};

// ─── Refresh Token Store ──────────────────────────────────────────────────────
// Refresh tokens are recorded server-side so that logout actually revokes them.
// Only a SHA-256 hash is persisted — the raw token never touches the database.

const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

/**
 * Grace period during which an already-rotated token is still accepted.
 * Two browser tabs (or a retrying mobile client) can refresh at nearly the same
 * moment; without this window the loser of that race would be logged out.
 */
const ROTATION_GRACE_MS = 60 * 1000;

const persistRefreshToken = async (
  userId: string,
  refreshToken: string,
  userAgent?: string,
): Promise<void> => {
  const decoded = jwt.decode(refreshToken) as { exp?: number } | null;
  const expiresAt = decoded?.exp
    ? new Date(decoded.exp * 1000)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId,
      expiresAt,
      userAgent: userAgent?.slice(0, 255) ?? null,
    },
  });
};

/**
 * Signs an access/refresh pair AND records the refresh token so it can later be
 * revoked. Every sign-in path must use this instead of bare `signTokens`.
 */
export const issueTokens = async (
  payload: { id: string; email: string | null; username: string; role: string },
  userAgent?: string,
): Promise<TokenPair> => {
  const tokens = signTokens(payload);
  await persistRefreshToken(payload.id, tokens.refreshToken, userAgent);
  return tokens;
};

/** Revokes a single refresh token (normal logout). Never throws. */
export const revokeRefreshToken = async (refreshToken: string): Promise<void> => {
  try {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch {
    // Logout must succeed for the client even if the write fails.
  }
};

/** Revokes every active session for a user (password change, token reuse). */
export const revokeAllUserTokens = async (userId: string): Promise<void> => {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
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

  const tokens = await issueTokens({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
  });

  return { user, tokens };
};

export const loginUser = async (dto: LoginDto, timezoneOffset: number = 0) => {
  const identifier = dto.email.toLowerCase();
  const isEmail = identifier.includes('@');

  let user;
  if (isEmail) {
    user = await prisma.user.findUnique({
      where: { email: identifier },
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
  } else {
    const cleanPhone = identifier.replace(/\D/g, '');
    const phoneToSearch = cleanPhone.startsWith('998') ? `+${cleanPhone}` : `+${cleanPhone}`;
    user = await prisma.user.findUnique({
      where: { phone: phoneToSearch },
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
  }

  if (!user) {
    throw createError('Invalid email, phone number, or password', 401);
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

  const tokens = await issueTokens({
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

/**
 * Exchanges a refresh token for a fresh pair, rotating the refresh token.
 *
 * Rules:
 *  - Signature/expiry must be valid.
 *  - The token must exist in the store (i.e. it was issued by us and not purged).
 *  - A revoked token is rejected — unless it was rotated within the grace window,
 *    in which case we return a new access token without rotating again.
 *  - Presenting a long-revoked token is treated as theft: every session for that
 *    user is revoked.
 */
export const refreshTokens = async (
  refreshToken: string,
  userAgent?: string,
): Promise<TokenPair & { rotated: boolean }> => {
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

  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  // Tokens issued before this feature shipped have no store entry. Accept them
  // once and adopt them into the store so nobody is logged out by the upgrade.
  if (!stored) {
    const tokens = await issueTokens(user, userAgent);
    return { ...tokens, rotated: true };
  }

  if (stored.expiresAt < new Date()) {
    throw createError('Invalid or expired refresh token', 401);
  }

  if (stored.revokedAt) {
    const revokedAgoMs = Date.now() - stored.revokedAt.getTime();

    if (revokedAgoMs <= ROTATION_GRACE_MS) {
      // Concurrent refresh from another tab — hand out an access token only.
      return { ...signTokens(user), refreshToken, rotated: false };
    }

    // Replay of an old token: assume it leaked and kill every session.
    await revokeAllUserTokens(user.id);
    throw createError('Refresh token has been revoked. Please sign in again.', 401);
  }

  const tokens = await issueTokens(user, userAgent);
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  return { ...tokens, rotated: true };
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
      tier: true,
      premiumUntil: true,
      _count: {
        select: {
          savedWords: true,
          badges: true,
        },
      },
    },
  });

  if (!user) throw createError('User not found', 404);

  // The entitlement snapshot rides along with /me so the shell knows the tier
  // and today's usage on first paint, without a second round trip. It is
  // recomputed from the database here — never trusted from the access token,
  // which may have been minted before an upgrade or an expiry.
  const entitlements = await getEntitlements(userId, timezoneOffset);

  return { ...user, tier: entitlements.tier, entitlements };
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

  const tokens = await issueTokens({
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

  const tokens = await issueTokens({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
  });

  const { passwordHash: _, ...safeUser } = user as typeof user & { passwordHash?: string };
  return { user: safeUser, tokens };
};

// ─── Telegram Phone Auth ──────────────────────────────────────────────────────

export const startPhoneAuthService = async (phone: string) => {
  // 1. Tozalanadi
  const cleanPhone = phone.replace(/\D/g, '');
  if (!cleanPhone.startsWith('998') || cleanPhone.length !== 12) {
    throw createError("Faqat +998 bilan boshlanuvchi O'zbekiston raqamlari qabul qilinadi", 400);
  }

  // 2. Token generatsiya qilish.
  //    The status endpoint hands out real access + refresh tokens once the bot
  //    verifies the phone, so this value is a bearer credential — it must not be
  //    guessable. A 5-digit code (90k possibilities) was brute-forceable inside
  //    the 5-minute window; 32 random bytes are not.
  //    base64url keeps it valid inside a Telegram deep link (`?start=<token>`,
  //    which allows A–Z a–z 0–9 _ - up to 64 characters).
  const token = crypto.randomBytes(32).toString('base64url');

  // 3. Eskirgan sessiyalarni tozalash (shu raqam uchun)
  await prisma.authSession.deleteMany({
    where: { phone: `+${cleanPhone}`, status: 'PENDING' },
  });

  // 4. Bazaga saqlash
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
    let user = await prisma.user.findUnique({
      where: { id: session.userId || undefined },
      include: {
        profile: true,
        _count: { select: { savedWords: true, badges: true } },
      },
    });

    if (!user) {
      user = await prisma.user.findUnique({
        where: { phone: session.phone },
        include: {
          profile: true,
          _count: { select: { savedWords: true, badges: true } },
        },
      });
    }

    // Return isNewUser = false so the frontend doesn't prompt for username setup modal,
    // as they already chose their username and password inside the Telegram bot.
    const isNewUser = false;

    // Streak yangilash
    if (user && user.profile) {
      await updateStreakOnLogin(user.id, user.profile, 0);
    }

    if (!user) {
      throw createError("User not found after verification", 404);
    }

    const tokens = await issueTokens({
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

export const checkPhoneExistsService = async (phone: string): Promise<boolean> => {
  const cleanPhone = phone.replace(/\D/g, '');
  const phoneToSearch = cleanPhone.startsWith('998') ? `+${cleanPhone}` : `+${cleanPhone}`;
  
  const user = await prisma.user.findUnique({
    where: { phone: phoneToSearch },
  });
  
  return !!user;
};


