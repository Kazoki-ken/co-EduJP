import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token =
      authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      res.status(401).json({ error: 'Authentication token required' });
      return;
    }

    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error('JWT_ACCESS_SECRET not configured');

    const decoded = jwt.verify(token, secret) as {
      id: string;
      email: string;
      username: string;
      role: string;
    };

    // Verify user still exists in DB
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, username: true, role: true },
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    next(err);
  }
};

/**
 * Optional auth — extracts user from JWT if a valid Bearer token is present,
 * but does NOT reject the request when there is no token or the token is invalid.
 * `req.user` will simply be undefined for unauthenticated callers.
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token =
      authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (token) {
      const secret = process.env.JWT_ACCESS_SECRET;
      if (secret) {
        const decoded = jwt.verify(token, secret) as {
          id: string;
          email: string;
          username: string;
          role: string;
        };

        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: { id: true, email: true, username: true, role: true },
        });

        if (user) {
          req.user = user;
        }
      }
    }
  } catch {
    // Silently ignore — user stays undefined
  }
  next();
};

