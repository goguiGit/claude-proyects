import { Router } from 'express';
import db from '../db/database.js';

const redirectRouter = Router();

redirectRouter.get('/:code', (req, res) => {
  const row = db
    .prepare('SELECT original_url FROM urls WHERE code = ?')
    .get(req.params.code) as { original_url: string } | undefined;

  if (!row) {
    res.status(404).json({ error: 'Short URL not found' });
    return;
  }

  res.redirect(301, row.original_url);
});

export default redirectRouter;
