import { Router } from 'express';
import { generateTrajectory, getTrajectoryAtMET } from '../lib/trajectory.js';
import { formatMET } from '../lib/orbital-math.js';

const router = Router();
const trajectory = generateTrajectory(600);
const MISSION_MAX_MET = trajectory[trajectory.length - 1].met;

let simStartTime = Date.now();
let simMET = 0;
const simSpeed = 1;

function getCurrentMET(): number {
  const elapsed = (Date.now() - simStartTime) / 1000;
  return Math.min(simMET + elapsed * simSpeed, MISSION_MAX_MET);
}

router.get('/current', (_req, res) => {
  const met = getCurrentMET();
  const point = getTrajectoryAtMET(trajectory, met);
  res.json({ ...point, metFormatted: formatMET(met) });
});

router.get('/:met', (req, res) => {
  const met = parseFloat(req.params.met);
  if (!isFinite(met) || met < 0 || met > MISSION_MAX_MET) {
    res.status(400).json({ error: `MET must be a finite number between 0 and ${MISSION_MAX_MET}` });
    return;
  }
  const point = getTrajectoryAtMET(trajectory, met);
  res.json({ ...point, metFormatted: formatMET(met) });
});

export default router;
