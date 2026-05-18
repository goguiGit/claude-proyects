import { Router } from 'express';
import db from '../db/database.js';
function generateCode() {
    return Math.random().toString(36).slice(2, 8);
}
const urlsRouter = Router();
urlsRouter.post('/', (req, res) => {
    const { url } = req.body;
    if (!url) {
        res.status(400).json({ error: 'url is required' });
        return;
    }
    let code = generateCode();
    let attempts = 0;
    while (db.prepare('SELECT 1 FROM urls WHERE code = ?').get(code) && attempts < 10) {
        code = generateCode();
        attempts++;
    }
    db.prepare('INSERT INTO urls (code, original_url, created_at) VALUES (?, ?, ?)').run(code, url, Date.now());
    res.status(201).json({ code, url });
});
urlsRouter.get('/', (_req, res) => {
    const urls = db
        .prepare('SELECT id, code, original_url, created_at FROM urls ORDER BY created_at DESC')
        .all();
    res.json(urls);
});
export default urlsRouter;
