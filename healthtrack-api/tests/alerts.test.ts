import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/index';
import { createTestUser, createTestPatient } from './setup';
import { computeAlertSeverity } from '../src/alerts/alerts.service';
import { createMetric } from '../src/health-metrics/metrics.service';
import { getDb } from '../src/database/connection';
import { loginUser } from '../src/auth/auth.service';
import type { TokenPayload } from '../src/auth/auth.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAdminPayload(userId: number): TokenPayload {
  return { userId, email: 'admin@test.com', role: 'admin', name: 'Admin' };
}

function loginToken(email: string, password: string): Promise<string> {
  const result = loginUser({ email, password });
  return Promise.resolve(result.token);
}

function seedAdminAndPatient() {
  const adminId = createTestUser({ email: 'admin@test.com', password: 'Admin123!', role: 'admin', name: 'Admin' });
  const doctorId = createTestUser({ email: 'doctor@test.com', password: 'Doctor123!', role: 'doctor', name: 'Doctor' });
  const patientUserId = createTestUser({ email: 'patient@test.com', password: 'Patient123!', role: 'patient', name: 'Patient' });
  const patientId = createTestPatient({ userId: patientUserId, doctorId });
  return { adminId, doctorId, patientUserId, patientId };
}

function insertMetricDirect(patientId: number, type: string, value: number, unit: string, secondaryValue?: number | null) {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO health_metrics (patient_id, metric_type, value, secondary_value, unit, recorded_at, recorded_by)
    VALUES (?, ?, ?, ?, ?, datetime('now'), NULL)
  `).run(patientId, type, value, secondaryValue ?? null, unit);
  return result.lastInsertRowid as number;
}

// ---------------------------------------------------------------------------
// 1. computeAlertSeverity — lógica pura de umbrales
// ---------------------------------------------------------------------------

describe('computeAlertSeverity — lógica de umbrales', () => {
  describe('glucosa', () => {
    it('should return critical when glucose is 130 mg/dL (>125)', () => {
      expect(computeAlertSeverity('glucose', 130)).toBe('critical');
    });

    it('should return warning when glucose is 110 mg/dL (101–125)', () => {
      expect(computeAlertSeverity('glucose', 110)).toBe('warning');
    });

    it('should return null when glucose is normal (85 mg/dL)', () => {
      expect(computeAlertSeverity('glucose', 85)).toBeNull();
    });
  });

  describe('presión sistólica', () => {
    it('should return critical when systolic is 145 (>140)', () => {
      expect(computeAlertSeverity('blood_pressure', 145)).toBe('critical');
    });

    it('should return warning when systolic is 130 (121–140)', () => {
      expect(computeAlertSeverity('blood_pressure', 130)).toBe('warning');
    });

    it('should return null when systolic is normal (115/null)', () => {
      expect(computeAlertSeverity('blood_pressure', 115)).toBeNull();
    });
  });

  describe('presión diastólica con sistólica normal', () => {
    it('should return critical when diastolic is 95 with normal systolic (110)', () => {
      // sistólica 110 → normal; diastólica 95 → critical (>90) → worst = critical
      expect(computeAlertSeverity('blood_pressure', 110, 95)).toBe('critical');
    });

    it('should return warning when diastolic is 85 with normal systolic (110)', () => {
      // sistólica 110 → normal; diastólica 85 → warning (81–90) → worst = warning
      expect(computeAlertSeverity('blood_pressure', 110, 85)).toBe('warning');
    });

    it('should return null when blood_pressure secondary_value is null (only systolic evaluated)', () => {
      // sistólica 115 normal, sin diastólica
      expect(computeAlertSeverity('blood_pressure', 115, null)).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// 2. createMetric → crea alert automáticamente en DB
// ---------------------------------------------------------------------------

describe('createMetric → crea alert automáticamente', () => {
  it('should create a critical alert when glucose is 130 mg/dL', () => {
    const { adminId, patientId } = seedAdminAndPatient();
    const db = getDb();

    createMetric(
      { patient_id: patientId, metric_type: 'glucose', value: 130, unit: 'mg/dL', recorded_at: new Date().toISOString() },
      adminId
    );

    const alert = db.prepare('SELECT * FROM alerts WHERE patient_id = ?').get(patientId) as { severity: string } | undefined;
    expect(alert).toBeDefined();
    expect(alert!.severity).toBe('critical');
  });

  it('should create a warning alert when glucose is 110 mg/dL', () => {
    const { adminId, patientId } = seedAdminAndPatient();
    const db = getDb();

    createMetric(
      { patient_id: patientId, metric_type: 'glucose', value: 110, unit: 'mg/dL', recorded_at: new Date().toISOString() },
      adminId
    );

    const alert = db.prepare('SELECT * FROM alerts WHERE patient_id = ?').get(patientId) as { severity: string } | undefined;
    expect(alert).toBeDefined();
    expect(alert!.severity).toBe('warning');
  });

  it('should create a critical alert when systolic blood pressure is 145', () => {
    const { adminId, patientId } = seedAdminAndPatient();
    const db = getDb();

    createMetric(
      { patient_id: patientId, metric_type: 'blood_pressure', value: 145, secondary_value: 80, unit: 'mmHg', recorded_at: new Date().toISOString() },
      adminId
    );

    const alert = db.prepare('SELECT * FROM alerts WHERE patient_id = ?').get(patientId) as { severity: string } | undefined;
    expect(alert).toBeDefined();
    expect(alert!.severity).toBe('critical');
  });

  it('should create a warning alert when systolic blood pressure is 130', () => {
    const { adminId, patientId } = seedAdminAndPatient();
    const db = getDb();

    createMetric(
      { patient_id: patientId, metric_type: 'blood_pressure', value: 130, secondary_value: 75, unit: 'mmHg', recorded_at: new Date().toISOString() },
      adminId
    );

    const alert = db.prepare('SELECT * FROM alerts WHERE patient_id = ?').get(patientId) as { severity: string } | undefined;
    expect(alert).toBeDefined();
    expect(alert!.severity).toBe('warning');
  });

  it('should create a critical alert when diastolic is 95 with normal systolic (110)', () => {
    const { adminId, patientId } = seedAdminAndPatient();
    const db = getDb();

    createMetric(
      { patient_id: patientId, metric_type: 'blood_pressure', value: 110, secondary_value: 95, unit: 'mmHg', recorded_at: new Date().toISOString() },
      adminId
    );

    const alert = db.prepare('SELECT * FROM alerts WHERE patient_id = ?').get(patientId) as { severity: string } | undefined;
    expect(alert).toBeDefined();
    expect(alert!.severity).toBe('critical');
  });

  it('should evaluate only systolic when secondary_value is null', () => {
    const { adminId, patientId } = seedAdminAndPatient();
    const db = getDb();

    // sistólica 130 → warning; sin diastólica
    createMetric(
      { patient_id: patientId, metric_type: 'blood_pressure', value: 130, secondary_value: undefined, unit: 'mmHg', recorded_at: new Date().toISOString() },
      adminId
    );

    const alert = db.prepare('SELECT * FROM alerts WHERE patient_id = ?').get(patientId) as { severity: string; secondary_value: null } | undefined;
    expect(alert).toBeDefined();
    expect(alert!.severity).toBe('warning');
    expect(alert!.secondary_value).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. NO crea alert con métricas normales
// ---------------------------------------------------------------------------

describe('createMetric → NO crea alert con métricas normales', () => {
  it('should create 0 alerts when glucose is 85 mg/dL (70–100)', () => {
    const { adminId, patientId } = seedAdminAndPatient();
    const db = getDb();

    createMetric(
      { patient_id: patientId, metric_type: 'glucose', value: 85, unit: 'mg/dL', recorded_at: new Date().toISOString() },
      adminId
    );

    const count = (db.prepare('SELECT COUNT(*) as c FROM alerts WHERE patient_id = ?').get(patientId) as { c: number }).c;
    expect(count).toBe(0);
  });

  it('should create 0 alerts when blood pressure is 115/75 (normal range)', () => {
    const { adminId, patientId } = seedAdminAndPatient();
    const db = getDb();

    createMetric(
      { patient_id: patientId, metric_type: 'blood_pressure', value: 115, secondary_value: 75, unit: 'mmHg', recorded_at: new Date().toISOString() },
      adminId
    );

    const count = (db.prepare('SELECT COUNT(*) as c FROM alerts WHERE patient_id = ?').get(patientId) as { c: number }).c;
    expect(count).toBe(0);
  });

  it('should create 0 alerts when temperature is 36.5°C (normal range)', () => {
    const { adminId, patientId } = seedAdminAndPatient();
    const db = getDb();

    createMetric(
      { patient_id: patientId, metric_type: 'temperature', value: 36.5, unit: '°C', recorded_at: new Date().toISOString() },
      adminId
    );

    const count = (db.prepare('SELECT COUNT(*) as c FROM alerts WHERE patient_id = ?').get(patientId) as { c: number }).c;
    expect(count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Boundary values (exactamente en el límite)
// ---------------------------------------------------------------------------

describe('Boundary values — valores exactamente en el límite', () => {
  it('should return null for glucose 100 (upper bound normal)', () => {
    expect(computeAlertSeverity('glucose', 100)).toBeNull();
  });

  it('should return warning for glucose 101 (first value above normal)', () => {
    expect(computeAlertSeverity('glucose', 101)).toBe('warning');
  });

  it('should return warning for glucose 125 (upper bound warning)', () => {
    expect(computeAlertSeverity('glucose', 125)).toBe('warning');
  });

  it('should return critical for glucose 126 (first value above warning)', () => {
    expect(computeAlertSeverity('glucose', 126)).toBe('critical');
  });

  it('should return null for systolic 120 (upper bound normal)', () => {
    expect(computeAlertSeverity('blood_pressure', 120)).toBeNull();
  });

  it('should return warning for systolic 121 (first value above normal)', () => {
    expect(computeAlertSeverity('blood_pressure', 121)).toBe('warning');
  });

  it('should return warning for systolic 140 (upper bound warning)', () => {
    expect(computeAlertSeverity('blood_pressure', 140)).toBe('warning');
  });

  it('should return critical for systolic 141 (first value above warning)', () => {
    expect(computeAlertSeverity('blood_pressure', 141)).toBe('critical');
  });

  it('should return null for glucose 70 (lower bound normal)', () => {
    expect(computeAlertSeverity('glucose', 70)).toBeNull();
  });

  it('should return warning for glucose 69 (first value below normal)', () => {
    expect(computeAlertSeverity('glucose', 69)).toBe('warning');
  });
});

// ---------------------------------------------------------------------------
// 5. GET /api/alerts/:patientId — autorización HTTP
// ---------------------------------------------------------------------------

describe('GET /api/alerts/:patientId — autorización', () => {
  it('should return 401 when no token is provided', async () => {
    const res = await request(app).get('/api/alerts/1');
    expect(res.status).toBe(401);
  });

  it('should allow admin to see alerts of any patient', async () => {
    const { adminId, patientId } = seedAdminAndPatient();
    const db = getDb();

    // insertar métrica anómala para tener una alerta
    createMetric(
      { patient_id: patientId, metric_type: 'glucose', value: 130, unit: 'mg/dL', recorded_at: new Date().toISOString() },
      adminId
    );

    const token = loginUser({ email: 'admin@test.com', password: 'Admin123!' }).token;
    const res = await request(app)
      .get(`/api/alerts/${patientId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].severity).toBe('critical');
  });

  it('should allow doctor to see alerts of their assigned patient', async () => {
    const { adminId, doctorId, patientId } = seedAdminAndPatient();

    createMetric(
      { patient_id: patientId, metric_type: 'glucose', value: 130, unit: 'mg/dL', recorded_at: new Date().toISOString() },
      adminId
    );

    const token = loginUser({ email: 'doctor@test.com', password: 'Doctor123!' }).token;
    const res = await request(app)
      .get(`/api/alerts/${patientId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should return 403 when doctor tries to see alerts of another doctor patient', async () => {
    // Crear dos doctores; el segundo intenta acceder a paciente del primero
    const doctor1Id = createTestUser({ email: 'doc1@test.com', password: 'Doc123!', role: 'doctor', name: 'Doc1' });
    createTestUser({ email: 'doc2@test.com', password: 'Doc123!', role: 'doctor', name: 'Doc2' });
    const patUser = createTestUser({ email: 'pat2@test.com', password: 'Patient123!', role: 'patient', name: 'Pat2' });
    const patientId = createTestPatient({ userId: patUser, doctorId: doctor1Id });

    createMetric(
      { patient_id: patientId, metric_type: 'glucose', value: 130, unit: 'mg/dL', recorded_at: new Date().toISOString() },
      doctor1Id
    );

    const token = loginUser({ email: 'doc2@test.com', password: 'Doc123!' }).token;
    const res = await request(app)
      .get(`/api/alerts/${patientId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('should allow patient to see their own alerts', async () => {
    const { adminId, patientId } = seedAdminAndPatient();

    createMetric(
      { patient_id: patientId, metric_type: 'glucose', value: 130, unit: 'mg/dL', recorded_at: new Date().toISOString() },
      adminId
    );

    const token = loginUser({ email: 'patient@test.com', password: 'Patient123!' }).token;
    const res = await request(app)
      .get(`/api/alerts/${patientId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should return 403 when patient tries to see another patients alerts', async () => {
    // Crear dos pacientes; el segundo intenta ver las alertas del primero
    const adminId = createTestUser({ email: 'admin2@test.com', password: 'Admin123!', role: 'admin', name: 'Admin2' });
    const pat1UserId = createTestUser({ email: 'pat1b@test.com', password: 'Patient123!', role: 'patient', name: 'Pat1' });
    createTestUser({ email: 'pat2b@test.com', password: 'Patient123!', role: 'patient', name: 'Pat2' });
    const patientId1 = createTestPatient({ userId: pat1UserId });
    createTestPatient({ userId: createTestUser({ email: 'pat2c@test.com', password: 'Patient123!', role: 'patient', name: 'Pat2C' }) });

    createMetric(
      { patient_id: patientId1, metric_type: 'glucose', value: 130, unit: 'mg/dL', recorded_at: new Date().toISOString() },
      adminId
    );

    // Autenticar como el segundo paciente (pat2b)
    const token = loginUser({ email: 'pat2b@test.com', password: 'Patient123!' }).token;
    const res = await request(app)
      .get(`/api/alerts/${patientId1}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('should return empty array when patient has no alerts', async () => {
    // Crear paciente sin métricas anómalas
    const { adminId, patientId } = seedAdminAndPatient();
    const token = loginUser({ email: 'admin@test.com', password: 'Admin123!' }).token;

    const res = await request(app)
      .get(`/api/alerts/${patientId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 6. PATCH /api/alerts/:id/acknowledge — autorización HTTP
// ---------------------------------------------------------------------------

describe('PATCH /api/alerts/:id/acknowledge — autorización', () => {
  it('should return 400 when alert id is not a number', async () => {
    const { adminId } = seedAdminAndPatient();
    const token = loginUser({ email: 'admin@test.com', password: 'Admin123!' }).token;

    const res = await request(app)
      .patch('/api/alerts/abc/acknowledge')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid alert id/i);
  });

  it('should return 404 when alert id does not exist', async () => {
    seedAdminAndPatient();
    const token = loginUser({ email: 'admin@test.com', password: 'Admin123!' }).token;

    const res = await request(app)
      .patch('/api/alerts/99999/acknowledge')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('should return 401 when no token is provided', async () => {
    const res = await request(app).patch('/api/alerts/1/acknowledge');
    expect(res.status).toBe(401);
  });

  it('should allow doctor to acknowledge alert of their assigned patient', async () => {
    const { adminId, patientId } = seedAdminAndPatient();
    const db = getDb();

    createMetric(
      { patient_id: patientId, metric_type: 'glucose', value: 130, unit: 'mg/dL', recorded_at: new Date().toISOString() },
      adminId
    );

    const alert = db.prepare('SELECT id FROM alerts WHERE patient_id = ?').get(patientId) as { id: number };
    const token = loginUser({ email: 'doctor@test.com', password: 'Doctor123!' }).token;

    const res = await request(app)
      .patch(`/api/alerts/${alert.id}/acknowledge`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Alert acknowledged');

    // Verificar que acknowledged se puso a 1
    const updated = db.prepare('SELECT acknowledged FROM alerts WHERE id = ?').get(alert.id) as { acknowledged: number };
    expect(updated.acknowledged).toBe(1);
  });

  it('should return 404 when doctor tries to acknowledge alert of another doctors patient', async () => {
    const doctor1Id = createTestUser({ email: 'doc1@test.com', password: 'Doc123!', role: 'doctor', name: 'Doc1' });
    createTestUser({ email: 'doc2@test.com', password: 'Doc123!', role: 'doctor', name: 'Doc2' });
    const patUser = createTestUser({ email: 'pat3@test.com', password: 'Patient123!', role: 'patient', name: 'Pat3' });
    const patientId = createTestPatient({ userId: patUser, doctorId: doctor1Id });
    const db = getDb();

    createMetric(
      { patient_id: patientId, metric_type: 'glucose', value: 130, unit: 'mg/dL', recorded_at: new Date().toISOString() },
      doctor1Id
    );

    const alert = db.prepare('SELECT id FROM alerts WHERE patient_id = ?').get(patientId) as { id: number };
    const token = loginUser({ email: 'doc2@test.com', password: 'Doc123!' }).token;

    const res = await request(app)
      .patch(`/api/alerts/${alert.id}/acknowledge`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('should allow patient to acknowledge their own alert', async () => {
    const { adminId, patientId } = seedAdminAndPatient();
    const db = getDb();

    createMetric(
      { patient_id: patientId, metric_type: 'glucose', value: 130, unit: 'mg/dL', recorded_at: new Date().toISOString() },
      adminId
    );

    const alert = db.prepare('SELECT id FROM alerts WHERE patient_id = ?').get(patientId) as { id: number };
    const token = loginUser({ email: 'patient@test.com', password: 'Patient123!' }).token;

    const res = await request(app)
      .patch(`/api/alerts/${alert.id}/acknowledge`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Alert acknowledged');
  });

  it('should return 404 when patient tries to acknowledge another patients alert', async () => {
    // Paciente 1 tiene alerta, paciente 2 intenta acknowledgerla
    const admin1Id = createTestUser({ email: 'adm1@test.com', password: 'Admin123!', role: 'admin', name: 'Adm1' });
    const pat1UserId = createTestUser({ email: 'pata@test.com', password: 'Patient123!', role: 'patient', name: 'PatA' });
    createTestUser({ email: 'patb@test.com', password: 'Patient123!', role: 'patient', name: 'PatB' });
    const patientId1 = createTestPatient({ userId: pat1UserId });

    const db = getDb();
    createMetric(
      { patient_id: patientId1, metric_type: 'glucose', value: 130, unit: 'mg/dL', recorded_at: new Date().toISOString() },
      admin1Id
    );

    const alert = db.prepare('SELECT id FROM alerts WHERE patient_id = ?').get(patientId1) as { id: number };
    const token = loginUser({ email: 'patb@test.com', password: 'Patient123!' }).token;

    const res = await request(app)
      .patch(`/api/alerts/${alert.id}/acknowledge`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('should allow admin to acknowledge any alert', async () => {
    const { adminId, patientId } = seedAdminAndPatient();
    const db = getDb();

    createMetric(
      { patient_id: patientId, metric_type: 'glucose', value: 130, unit: 'mg/dL', recorded_at: new Date().toISOString() },
      adminId
    );

    const alert = db.prepare('SELECT id FROM alerts WHERE patient_id = ?').get(patientId) as { id: number };
    const token = loginUser({ email: 'admin@test.com', password: 'Admin123!' }).token;

    const res = await request(app)
      .patch(`/api/alerts/${alert.id}/acknowledge`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});
