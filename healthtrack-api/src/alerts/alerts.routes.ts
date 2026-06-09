import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate, authorize } from '../auth/auth.middleware';
import { getAlertsByPatient, acknowledgeAlert } from './alerts.service';
import type { AcknowledgeResult } from './alerts.service';

const router = Router();

router.get('/:patientId', authenticate, authorize('admin', 'doctor', 'patient'), (req: Request, res: Response) => {
  const patientId = parseInt(req.params.patientId, 10);
  if (isNaN(patientId)) {
    res.status(400).json({ error: 'Invalid patient id' });
    return;
  }

  const alerts = getAlertsByPatient(patientId, req.user!);
  if (alerts === null) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  res.json({ data: alerts, count: alerts.length });
});

router.patch('/:id/acknowledge', authenticate, authorize('admin', 'doctor', 'patient'), (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid alert id' });
    return;
  }

  const result: AcknowledgeResult = acknowledgeAlert(id, req.user!);
  if (result === 'not_found') {
    res.status(404).json({ error: 'Alert not found or access denied' });
    return;
  }
  if (result === 'conflict') {
    res.status(409).json({ error: 'Alert already acknowledged' });
    return;
  }

  res.json({ message: 'Alert acknowledged' });
});

export default router;
