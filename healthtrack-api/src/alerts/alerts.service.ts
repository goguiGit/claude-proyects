import { getDb } from '../database/connection';
import { checkMetricStatus } from '../health-metrics/metrics.service';
import type { Alert, CreateAlertDTO, AlertSeverity } from './alerts.types';
import type { MetricType } from '../health-metrics/metrics.types';
import type { TokenPayload } from '../auth/auth.types';

// Rangos diastólicos (blood_pressure secondary_value)
function checkDiastolicStatus(value: number): 'normal' | 'warning' | 'critical' {
  if (value >= 60 && value <= 80) return 'normal';
  if (value > 90 || value < 50) return 'critical';
  return 'warning';
}

function worstSeverity(
  a: 'normal' | 'warning' | 'critical',
  b: 'normal' | 'warning' | 'critical'
): 'normal' | 'warning' | 'critical' {
  if (a === 'critical' || b === 'critical') return 'critical';
  if (a === 'warning' || b === 'warning') return 'warning';
  return 'normal';
}

export function computeAlertSeverity(
  metricType: MetricType,
  value: number,
  secondaryValue?: number | null
): AlertSeverity | null {
  let status = checkMetricStatus(metricType, value);

  if (metricType === 'blood_pressure' && secondaryValue != null) {
    const diastolicStatus = checkDiastolicStatus(secondaryValue);
    status = worstSeverity(status, diastolicStatus);
  }

  if (status === 'normal') return null;
  return status;
}

export function createAlert(dto: CreateAlertDTO): Alert {
  const db = getDb();

  const result = db.prepare(`
    INSERT INTO alerts (patient_id, metric_id, metric_type, value, secondary_value, severity)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    dto.patient_id,
    dto.metric_id,
    dto.metric_type,
    dto.value,
    dto.secondary_value ?? null,
    dto.severity
  );

  return db.prepare('SELECT * FROM alerts WHERE id = ?').get(result.lastInsertRowid) as Alert;
}

export function getAlertsByPatient(patientId: number, requestor: TokenPayload): Alert[] | null {
  const db = getDb();

  // Verificar que el requestor tiene acceso a este paciente
  if (requestor.role === 'patient') {
    const patient = db.prepare('SELECT user_id FROM patients WHERE id = ?').get(patientId) as { user_id: number } | undefined;
    if (!patient || patient.user_id !== requestor.userId) return null;
  }

  if (requestor.role === 'doctor') {
    const patient = db.prepare('SELECT assigned_doctor_id FROM patients WHERE id = ?').get(patientId) as { assigned_doctor_id: number } | undefined;
    if (!patient || patient.assigned_doctor_id !== requestor.userId) return null;
  }

  return db.prepare(`
    SELECT a.*, u.name as patient_name
    FROM alerts a
    JOIN patients p ON a.patient_id = p.id
    JOIN users u ON p.user_id = u.id
    WHERE a.patient_id = ?
    ORDER BY a.created_at DESC
  `).all(patientId) as Alert[];
}

export type AcknowledgeResult = 'ok' | 'not_found' | 'conflict';

export function acknowledgeAlert(alertId: number, requestor: TokenPayload): AcknowledgeResult {
  const db = getDb();

  const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(alertId) as Alert | undefined;
  if (!alert) return 'not_found';

  if (requestor.role === 'patient') {
    const patient = db.prepare('SELECT user_id FROM patients WHERE id = ?').get(alert.patient_id) as { user_id: number } | undefined;
    if (!patient || patient.user_id !== requestor.userId) return 'not_found';
  }

  if (requestor.role === 'doctor') {
    const patient = db.prepare('SELECT assigned_doctor_id FROM patients WHERE id = ?').get(alert.patient_id) as { assigned_doctor_id: number } | undefined;
    if (!patient || patient.assigned_doctor_id !== requestor.userId) return 'not_found';
  }

  if (alert.acknowledged === 1) return 'conflict';

  db.prepare('UPDATE alerts SET acknowledged = 1 WHERE id = ?').run(alertId);

  db.prepare(`
    INSERT INTO audit_log (user_id, action, resource, resource_id, details)
    VALUES (?, 'ACKNOWLEDGE_ALERT', 'alerts', ?, ?)
  `).run(
    requestor.userId,
    alertId,
    JSON.stringify({ patient_id: alert.patient_id, severity: alert.severity, role: requestor.role })
  );

  return 'ok';
}
