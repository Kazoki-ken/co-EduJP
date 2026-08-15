import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { AuthenticatedRequest } from './auth.middleware';

/**
 * Maintenance mode — "texnik ko'rik".
 *
 * When the `maintenance_mode` site configuration is on, every API route answers
 * 503 for ordinary visitors while admins keep full access. The switch lives in
 * the database (admin panel → Site Configuration) rather than in an env var so
 * turning it on or off does not need a deploy or an SSH session.
 */

export const MAINTENANCE_KEY = 'maintenance_mode';
export const MAINTENANCE_MESSAGE_KEY = 'maintenance_message';

export const DEFAULT_MAINTENANCE_MESSAGE =
  "Saytda texnik ko'rik ketyapti. Iltimos, birozdan so'ng qayta urinib ko'ring.";

/** Values that count as "on" — the admin panel writes plain text into config. */
const TRUTHY = new Set(['1', 'on', 'true', 'yes', 'ha', 'yoq', 'enabled']);

export const isMaintenanceValueOn = (value: string | undefined | null): boolean =>
  !!value && TRUTHY.has(value.trim().toLowerCase());

/**
 * Routes that stay open while the gate is closed.
 *
 * Auth has to keep working or the admin could never sign in to turn the mode
 * back off; the health check keeps the process monitorable; `/api/config/public`
 * is what the web app reads to render the maintenance screen itself.
 * `/api/admin` carries its own `authenticate` + `requireAdmin` pair.
 */
const OPEN_PREFIXES = [
  '/api/health',
  '/api/auth',
  '/api/admin',
  '/api/config/public',
];

// ─── Config cache ─────────────────────────────────────────────────────────────
// Every request would otherwise hit the database twice just to learn that the
// site is up. The flag changes by hand, so a few seconds of staleness costs
// nothing.

const CACHE_TTL_MS = 5_000;

let cache: { on: boolean; message: string; readAt: number } | null = null;

const readMaintenanceState = async (): Promise<{ on: boolean; message: string }> => {
  if (cache && Date.now() - cache.readAt < CACHE_TTL_MS) {
    return { on: cache.on, message: cache.message };
  }

  try {
    const rows = await prisma.siteConfiguration.findMany({
      where: { key: { in: [MAINTENANCE_KEY, MAINTENANCE_MESSAGE_KEY] } },
    });
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const state = {
      on: isMaintenanceValueOn(map.get(MAINTENANCE_KEY)),
      message: map.get(MAINTENANCE_MESSAGE_KEY)?.trim() || DEFAULT_MAINTENANCE_MESSAGE,
    };
    cache = { ...state, readAt: Date.now() };
    return state;
  } catch {
    // A database hiccup must not lock everyone out of a healthy site.
    return { on: false, message: DEFAULT_MAINTENANCE_MESSAGE };
  }
};

/** Called by the admin config writer so a toggle takes effect immediately. */
export const invalidateMaintenanceCache = (): void => {
  cache = null;
};

/**
 * Is this request coming from an admin?
 *
 * The role is re-read from the database instead of trusted from the token: an
 * account demoted since its last sign-in must lose the bypass too.
 */
const isAdminRequest = async (req: AuthenticatedRequest): Promise<boolean> => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return false;

  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) return false;

  try {
    const decoded = jwt.verify(token, secret) as { id?: string; role?: string };
    if (!decoded?.id || decoded.role !== 'ADMIN') return false;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { role: true },
    });
    return user?.role === 'ADMIN';
  } catch {
    return false;
  }
};

export const maintenanceGate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { on, message } = await readMaintenanceState();
  if (!on) {
    next();
    return;
  }

  if (OPEN_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
    next();
    return;
  }

  if (await isAdminRequest(req)) {
    next();
    return;
  }

  res.setHeader('Retry-After', '3600');
  res.status(503).json({ maintenance: true, error: message });
};
