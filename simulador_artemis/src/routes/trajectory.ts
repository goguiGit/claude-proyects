import { Router } from 'express';
import { generateTrajectory } from '../lib/trajectory.js';

const router = Router();
const cachedTrajectory = generateTrajectory(600);

router.get('/', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  res.json(cachedTrajectory);
});

export default router;
