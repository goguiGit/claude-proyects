import { Router } from 'express';
import db from '../db/database.js';
import { requireAuth } from '../middleware/auth.middleware.js';

function generateCode(): string {
  return Math.random().toString(36).slice(2, 8);
}

const urlsRouter = Router();

urlsRouter.post('/', requireAuth, (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url) {
    res.status(400).json({ error: 'url is required' });
    return;
  }
  const userId = req.user!.userId;

  let code = generateCode();
  let attempts = 0;
  while (db.prepare('SELECT 1 FROM urls WHERE code = ?').get(code) && attempts < 10) {
    code = generateCode();
    attempts++;
  }

  db.prepare(
    'INSERT INTO urls (code, original_url, created_at, user_id) VALUES (?, ?, ?, ?)',
  ).run(code, url, Date.now(), userId);

  res.status(201).json({ code, url });
});

urlsRouter.get('/', (_req, res) => {
  const urls = db
    .prepare('SELECT id, code, original_url, created_at, user_id FROM urls ORDER BY created_at DESC')
    .all();
  res.json(urls);
});

urlsRouter.delete('/:code', requireAuth, (req, res) => {
  const { code } = req.params;
  const userId = req.user!.userId;

  const row = db
    .prepare('SELECT user_id FROM urls WHERE code = ?')
    .get(code) as { user_id: number } | undefined;

  if (!row) {
    res.status(404).json({ error: 'URL not found' });
    return;
  }
  if (row.user_id !== userId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  db.prepare('DELETE FROM urls WHERE code = ?').run(code);
  res.status(204).send();
});

export default urlsRouter;
