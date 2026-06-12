import { Router } from 'express';
import { MISSION_EVENTS } from '../data/events.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json(MISSION_EVENTS);
});

router.get('/upcoming', (req, res) => {
  const raw = req.query.met;
  const parsed = typeof raw === 'string' ? parseFloat(raw) : NaN;
  const met = isFinite(parsed) && parsed >= 0 ? parsed : 0;
  const upcoming = MISSION_EVENTS.filter(e => e.met >= met).slice(0, 3);
  res.json(upcoming);
});

export default router;
