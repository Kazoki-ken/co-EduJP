import { Router } from 'express';
import { register, login, refresh, logout, me } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * POST /api/auth/register
 * Create a new user account
 */
router.post('/register', register);

/**
 * POST /api/auth/login
 * Login and receive access + refresh tokens
 */
router.post('/login', login);

/**
 * POST /api/auth/refresh
 * Exchange refresh token (httpOnly cookie) for new access token
 */
router.post('/refresh', refresh);

/**
 * POST /api/auth/logout
 * Clear the refresh token cookie
 */
router.post('/logout', logout);

/**
 * GET /api/auth/me
 * Get current authenticated user profile
 */
router.get('/me', authenticate, me);

export default router;
