import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      service: 'VocabJP API',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch {
    res.status(503).json({
      status: 'error',
      service: 'VocabJP API',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    });
  }
});

export default router;
