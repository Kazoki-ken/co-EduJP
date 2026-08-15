import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';
import {
  getTest,
  getTests,
  patchGroup,
  patchQuestion,
  patchTest,
  postGroup,
  postImport,
  postQuestion,
  postTest,
  removeGroup,
  removeQuestion,
  removeTest,
} from '../controllers/jlptAdmin.controller';

const router = Router();

// Everything here is admin-only.
router.use(authenticate, requireAdmin);

// ─── Tests, groups, questions ─────────────────────────────────────────────────

router.get('/tests', getTests);
router.post('/tests', postTest);
router.get('/tests/:id', getTest);
router.patch('/tests/:id', patchTest);
router.delete('/tests/:id', removeTest);

router.post('/tests/:id/groups', postGroup);
router.patch('/groups/:id', patchGroup);
router.delete('/groups/:id', removeGroup);

router.post('/groups/:id/questions', postQuestion);
router.patch('/questions/:id', patchQuestion);
router.delete('/questions/:id', removeQuestion);

// ─── Spreadsheet import ───────────────────────────────────────────────────────

const sheetUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post('/tests/:id/import', sheetUpload.single('file'), postImport);

// ─── Media (images and audio) ─────────────────────────────────────────────────

/**
 * Uploaded media lives on disk, not in the database.
 *
 * Audio clips are the reason: a listening paper is tens of megabytes, and
 * pushing that through Postgres bloats every backup and slows every read for
 * no gain. The folder sits outside the repo and is served back through the
 * API, so no nginx change is needed — `/api/` already reaches this process.
 *
 * Worth remembering at backup time: the database alone is no longer the whole
 * of the data.
 */
const MEDIA_ROOT = path.resolve(process.cwd(), 'uploads', 'jlpt');
fs.mkdirSync(MEDIA_ROOT, { recursive: true });

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'];

const mediaUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, MEDIA_ROOT),
    // A random name, keeping only the extension: two admins uploading
    // "audio.mp3" must not overwrite each other, and the original name is not
    // trusted for path building.
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().slice(0, 8);
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  // A full listening section runs long; 25 MB turned out to be tight.
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if ([...IMAGE_TYPES, ...AUDIO_TYPES].includes(file.mimetype)) return cb(null, true);
    cb(new Error(`Qoʻllab-quvvatlanmaydigan fayl turi: ${file.mimetype}`));
  },
});

/** POST /api/admin/jlpt/media — returns the URL to store on a question. */
router.post('/media', mediaUpload.single('file'), (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'Fayl yuborilmadi' });
    return;
  }
  res.status(201).json({
    url: `/api/jlpt-media/${file.filename}`,
    kind: IMAGE_TYPES.includes(file.mimetype) ? 'image' : 'audio',
    size: file.size,
  });
});

/** Multer rejections arrive as plain errors; answer them as clean JSON. */
router.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: `Fayl xatosi: ${err.message}` });
    return;
  }
  if (err instanceof Error) {
    res.status(400).json({ error: err.message });
    return;
  }
  next(err);
});

export { MEDIA_ROOT };
export default router;
