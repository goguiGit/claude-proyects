# HealthTrack API — Memoria de Codebase

## Architecture Overview

**HealthTrack API** es una API REST en **Node.js/TypeScript con Express**, que implementa un sistema de seguimiento de salud médica con autenticación JWT, control de acceso basado en roles (RBAC), métricas de salud, alertas automáticas y auditoría de cambios.

Stack:
- **Runtime**: Node.js + TypeScript (strict mode)
- **Framework**: Express.js
- **BD**: SQLite 3 con better-sqlite3 (sync queries)
- **Auth**: JWT + bcrypt
- **Testing**: Vitest + supertest (in-memory DB)
- **Config**: Centralizado en `src/config.ts`

Patrón: modular por dominio (auth, patients, appointments, health-metrics, notifications, alerts) con servicios sin estado que acceden directamente a BD y middlewares Express globales.

---

## HTTP Endpoints Reference

### Auth (público)
```
POST   /api/auth/register        { email, password, name, role }
POST   /api/auth/login           { email, password }
```

### Patients (protegido)
```
GET    /api/patients             [admin: todos, doctor: asignados, patient: él mismo]
GET    /api/patients/:id         
POST   /api/patients             [admin, doctor] 
PUT    /api/patients/:id         [admin, doctor]
DELETE /api/patients/:id         [admin]
```

### Appointments (protegido)
```
GET    /api/appointments         [filtra por rol]
GET    /api/appointments/:id
POST   /api/appointments         [admin, doctor]
PUT    /api/appointments/:id     [cualquiera autenticado]
DELETE /api/appointments/:id     [cancela appointment]
```

### Health Metrics (protegido)
```
GET    /api/health-metrics/:patientId          { type?, dateFrom?, dateTo? }
GET    /api/health-metrics/:patientId/summary  [resumen de últimas métricas]
POST   /api/health-metrics                     [crea métrica + alerta si anómala]
```

### Alerts (protegido)
```
GET    /api/alerts/:patientId    [RBAC: admin todos, doctor sus pacientes, patient él]
PATCH  /api/alerts/:id/acknowledge
```

### Notifications (protegido)
```
GET    /api/notifications         [filtra por rol]
GET    /api/notifications/unread-count
PATCH  /api/notifications/:id/read
```

### Health Check
```
GET    /api/health                [sin auth, devuelve { status: 'ok', timestamp }]
```

---

## Module Map

### 1. **auth/** — Autenticación y autorización

**Archivos**:
- `auth.service.ts` — Registro, login, generación/verificación JWT
- `auth.routes.ts` — POST `/register`, POST `/login`
- `auth.middleware.ts` — `authenticate()`, `authorize(...roles)`
- `auth.types.ts` — `User`, `TokenPayload`, `Role` (doctor|patient|admin)

**Características**:
- Registro con validación de email único
- Login con contraseña hasheada (bcrypt, 10 rounds)
- Tokens JWT con payload: `{ userId, email, role, name }`
- Expiración: 24h (86400s)
- Middleware `authenticate` requerido en todas las rutas protegidas
- Middleware `authorize(...roles)` restringe por rol
- TokenPayload disponible en `req.user` después de `authenticate()`

**GOTCHA**: JWT secret está hardcodeado en `config.ts` (ver DEBT).

---

### 2. **patients/** — CRUD de pacientes

**Archivos**:
- `patients.service.ts` — Lógica de acceso con RBAC
- `patients.routes.ts` — GET/POST/PUT/DELETE `/api/patients`
- `patients.validation.ts` — Validación de DTOs
- `patients.types.ts` — `Patient`, `CreatePatientDTO`, `UpdatePatientDTO`

**Características**:
- `getPatients()` — filtra por rol: admin (todos), doctor (sus asignados), patient (solo él)
- `getPatientById()` — verifica autorización (security issue: doctores ven cualquier paciente)
- `createPatient()` — solo admin/doctor
- `updatePatient()` — PATCH parcial con campos dinámicos
- `deletePatient()` — solo admin, pero hace hard delete (DEBT)
- Campos: user_id, date_of_birth, gender, blood_type, allergies (JSON), emergency_contact, emergency_phone, assigned_doctor_id

**Validación**:
- Requiere date_of_birth en formato YYYY-MM-DD
- gender ∈ {male, female, other}
- blood_type ∈ {A+, A-, B+, B-, AB+, AB-, O+, O-}

**GOTCHA**: En `getPatientById()` línea 54-58, doctores NO verifican que el paciente sea suyo; cualquier doctor accede a cualquier paciente.

---

### 3. **health-metrics/** — Registro y análisis de métricas

**Archivos**:
- `metrics.service.ts` — Lógica de métricas, detección de anomalías, N+1 issue
- `metrics.routes.ts` — GET/POST `/api/health-metrics/:patientId`
- `metrics.validation.ts` — Validación de tipos y rangos
- `metrics.types.ts` — `HealthMetric`, `CreateMetricDTO`, `MetricSummary`

**Características**:
- Tipos soportados: blood_pressure, glucose, weight, heart_rate, temperature, oxygen_saturation
- `checkMetricStatus(metricType, value)` → 'normal'|'warning'|'critical'
- `createMetric()` → automáticamente crea alert + notification si hay anomalía
- `getPatientSummary()` — calcula avg, min, max, trend (rising/falling/stable)
- Rangos hardcodeados en METRIC_RANGES (línea 7-13)
- blood_pressure usa secondary_value para diastólica

**Validación**:
- patient_id, metric_type, value, unit, recorded_at requeridos
- value debe ser positivo
- recorded_at en formato ISO 8601 (YYYY-MM-DDTHH:MM)
- secondary_value NO es validado (DEBT)

**Flujo de createMetric()**:
1. Inserta en health_metrics
2. Obtiene metric con join a usuarios
3. Calcula severity con `computeAlertSeverity()`
4. Si severity != null: crea Alert + Notification
5. Retorna metric completa

**GOTCHA - DEBT (línea 84)**: `getPatientSummary()` hace N+1 queries (una por cada tipo de métrica) en lugar de GROUP BY. Con muchos pacientes → degradación seria.

**GOTCHA**: `createMetric()` no valida que secondary_value exista para blood_pressure, aunque médicamente es requerido.

---

### 4. **alerts/** — Sistema de alertas con auditoría

**Archivos**:
- `alerts.service.ts` — Creación, retrieval, acknowledgment con registro de auditoría
- `alerts.routes.ts` — GET/PATCH `/api/alerts`
- `alerts.types.ts` — `Alert`, `AlertSeverity` (warning|critical)

**Características**:
- `computeAlertSeverity(metricType, value, secondaryValue?)` → lógica pura de umbrales
- Para blood_pressure: evalúa sistólica Y diastólica, toma la "peor" severidad usando `worstSeverity()`
- `createAlert()` — inserta en tabla alerts (acknowledged=0 por defecto)
- `getAlertsByPatient()` — RBAC: admin (todos), doctor (sus pacientes), patient (solo él)
- `acknowledgeAlert()` — marca como acknowledged=1 + escribe en audit_log con detalles del usuario

**Thresholds** (línea 7-12 metrics.service.ts):
- Glucosa: normal 70-100, warning 101-125, critical >125 o <70
- Presión sistólica: normal 90-120, warning 121-140, critical >140 o <80
- Diastólica (en alerts.service): normal 60-80, warning 81-90, critical >90 o <50
- Heart rate: normal 60-100, warning 101-120/50-59, critical >120 o <50
- Temperature: normal 36.1-37.2, warning 37.3-38.0/<36, critical >38 o <35.5
- O₂: normal 95-100, warning 90-94, critical <90

**GOTCHA**: Acknowledge escribe auditoria (línea 103-110) pero otros endpoints NO lo hacen. Inconsistencia en auditoría.

---

### 5. **notifications/** — Notificaciones de sistema

**Archivos**:
- `notifications.service.ts` — Create, retrieval con RBAC
- `notifications.routes.ts` — GET/PATCH `/api/notifications`
- `notifications.types.ts` — `Notification`, tipos (metric_warning|metric_critical|appointment_reminder|general)

**Características**:
- Se crea automáticamente por `metrics.service.createMetric()` si hay alert
- Filtradas por rol (admin: todas, doctor: de sus pacientes, patient: las suyas)
- `getUnreadCount()` — cuenta notificaciones no leídas (read=0)
- `markAsRead()` — con verificación de autorización
- Severidad: info|warning|critical
- Puede tener related_metric_id para vincular a métrica que la generó

---

### 6. **appointments/** — Gestión de citas

**Archivos**:
- `appointments.service.ts` — CRUD con control de acceso
- `appointments.routes.ts` — GET/POST/PUT/PATCH/DELETE `/api/appointments`
- `appointments.validation.ts` — Validación (presente)
- `appointments.types.ts` — `Appointment`, DTOs

**Características**:
- Status: scheduled|confirmed|completed|cancelled
- RBAC: admin (todas), doctor (las suyas), patient (las suyas)
- `getAppointmentById()` verifica autorización
- `cancelAppointment()` solo actualiza status = 'cancelled', no borra
- duration_minutes: default 30, rango 5-480
- date_time en ISO 8601 format

**Validación**:
- patient_id, doctor_id, date_time requeridos
- date_time en formato YYYY-MM-DDTHH:MM
- duration_minutes ∈ [5, 480]
- status ∈ {scheduled, confirmed, completed, cancelled}

---

### 7. **database/** — Capa de persistencia

**Archivos**:
- `connection.ts` — Singleton de BD con lazy init
- `migrations.ts` — SQL DDL para crear esquema
- `seed.ts` — Populate DB con datos de ejemplo realistas

**Características**:
- `getDb()` — retorna instancia singleton, ejecuta migraciones en primer acceso
- WAL mode habilitado (Write-Ahead Logging)
- Foreign keys ON
- `setDb()` — permite inyectar BD en memoria para tests
- `closeDb()` — limpieza manual

**Schema** (8 tablas):
- users (id, email UNIQUE, password_hash, role CHECK, name, created_at)
- patients (id, user_id FK, assigned_doctor_id FK nullable, date_of_birth, gender, blood_type, allergies JSON, emergency_contact, emergency_phone, created_at)
- appointments (id, patient_id FK, doctor_id FK, date_time, duration_minutes default 30, status default 'scheduled' CHECK, reason, notes, created_at)
- health_metrics (id, patient_id FK, metric_type CHECK, value, secondary_value, unit, recorded_at, recorded_by FK nullable, notes, created_at)
- notifications (id, patient_id FK, type CHECK, title, message, severity default 'info' CHECK, read default 0, related_metric_id FK nullable, created_at)
- alerts (id, patient_id FK ON DELETE CASCADE, metric_id FK ON DELETE CASCADE, metric_type, value, secondary_value, severity CHECK, acknowledged default 0, created_at)
- audit_log (id, user_id FK nullable, action, resource, resource_id, details JSON, ip_address, created_at)
- sqlite_sequence (automático)

---

### 8. **middleware/** — Middlewares globales

**audit-logger.ts**:
- Intercepta respuestas exitosas en POST/PUT/PATCH/DELETE
- Registra en audit_log: user_id, action (HTTP method), resource, path, body, IP
- Silencia errores de BD (no interrumpe respuesta)
- Extrae resource del primer segmento del path

**error-handler.ts**:
- Express error handler global (debe ir al final con `app.use(errorHandler)`)
- En dev: envía stack + SQL errors completos (security issue)
- En prod: mensajes genéricos
- Respeta statusCode si está en error

**rate-limiter.ts**:
- In-memory Map por IP
- Config: 100 requests / 60s por defecto
- Limpieza auto de entradas expiradas cada minuto
- Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
- Retorna 429 si supera límite

---

## Patterns & Conventions

### Nomenclatura
- Archivos: `kebab-case` (auth.service.ts, patients.routes.ts)
- Funciones: `camelCase` (getPatients, createMetric)
- Tipos/Interfaces: `PascalCase` (User, CreatePatientDTO, HealthMetric)
- Variables de entorno: `UPPER_SNAKE_CASE` (DB_PATH, JWT_SECRET)

### Respuestas HTTP
```json
// Éxito con colección:
{ "data": [...], "count": n }

// Éxito con recurso único:
{ "data": { ... } }

// Mensaje:
{ "message": "Patient deleted" }

// Error:
{ "error": "descripción" }
```

Códigos HTTP:
- `200` OK, `201` Created
- `400` Validación, `401` Auth, `403` Autorización, `404` No encontrado, `409` Conflicto
- `429` Rate limit, `500` Error interno

### Control de Acceso (RBAC)
- **admin**: acceso total a todos los recursos
- **doctor**: ve sus pacientes asignados, sus citas, notificaciones de sus pacientes, alertas de sus pacientes
- **patient**: ve solo su registro, sus citas, sus métricas y alertas

### Flujo de crear métrica
1. `POST /api/health-metrics` con `{ patient_id, metric_type, value, secondary_value?, unit, recorded_at, notes? }`
2. Route llama `validateCreateMetric()` → valida formato
3. Route llama `createMetric(dto, req.user.userId)` → service inserta en health_metrics
4. Service llama `computeAlertSeverity()` → si != null, crea Alert + Notification
5. Alert se marca "acknowledged=0" por defecto
6. Route retorna métrica con join a `recorded_by` user

### Manejo de errores
- Servicios lanzan `Error` con mensaje descriptivo
- Routes capturan con try/catch y mapean a HTTP
- Error handler global en index.ts (línea 49) maneja lo no capturado
- **FIXME**: En dev se revela SQL internals (ver error-handler.ts línea 18-26)

---

## Known Issues & Tech Debt

### CRITICAL (Seguridad)
1. **getPatientById() — SECURITY FLAW** (`patients.service.ts:54-58`)
   - Doctores NO verifican que `patient.assigned_doctor_id === user.userId`
   - Cualquier doctor accede a cualquier paciente
   - Fix: Añadir check en línea 56: `|| (user.role === 'doctor' && patient.assigned_doctor_id !== user.userId)`

2. **JWT_SECRET hardcodeado** (`config.ts:5`)
   - Marcado como FIXME en el código
   - Debe venir de `process.env.JWT_SECRET`
   - Lanzar error en startup si no está definida

3. **Error handler expone SQL** (`middleware/error-handler.ts:18-26`)
   - En dev mode envía stack traces y SQL internals al cliente
   - Information disclosure risk
   - Solución: sanitizar antes de enviar, nunca exponer schema

### PERFORMANCE
4. **N+1 queries en getPatientSummary()** (`metrics.service.ts:78-127`)
   - Itera sobre 6 tipos de métrica, hace una query por cada una
   - Debería usar una query única con GROUP BY
   - Impacto: O(n) queries por paciente resumen calculado
   - Visible cuando se llama GET `/api/health-metrics/:patientId/summary` frecuentemente

### FUNCTIONAL DEBT
5. **Hard delete de pacientes** (`patients.service.ts:109-115`)
   - `deletePatient()` hace DELETE en lugar de soft delete
   - No auditable después; viola compliance
   - Fix: Añadir columna `deleted_at`, filtrar en SELECT, cascade en alerts/metrics

6. **Validación incompleta de blood_pressure** (`metrics.validation.ts:26-29`)
   - No requiere `secondary_value` aunque es médicamente esencial
   - Permite guardar presión sistólica sin diastólica
   - Fix: Validar que secondary_value != null cuando metric_type == 'blood_pressure'

7. **Inconsistencia en auditoría** 
   - `acknowledgeAlert()` escribe en audit_log (línea 103-110)
   - Pero otros endpoints (createPatient, updatePatient, etc.) NO lo hacen
   - Solo el middleware generic audit-logger registra mutaciones (pero no en detalle)

### TESTING GAPS
8. **Cobertura incompleta**
   - `auth.test.ts` marca DEBT: faltan tests para expiración, roles inválidos
   - `patients.test.ts` marca DEBT: no testa security flaw de doctores
   - Appointments: no hay tests HTTP (solo setup helpers)
   - Notifications: sin tests

### CODE QUALITY
9. **Validación hardcodeada**
   - Métric ranges en `metrics.service.ts:7-13` (hardcoded en objeto)
   - Debería estar en config o tabla de BD para ser editable

10. **Duplicación en RBAC checks**
    - Mismo patrón de `if (user.role === 'admin')` / `doctor` / `patient` en múltiples servicios
    - Candidato para helpers/decoradores

---

## Key Decisions

### 1. Sincrónico con better-sqlite3
- Queries síncronas en lugar de async/await con pool
- Pro: código simple, transacciones explícitas
- Con: no escala a alta concurrencia; thread-blocking
- Decisión apropiada para monolito inicial

### 2. SQL directo, sin ORM
- Queries SQL en strings en lugar de ORM como Prisma
- Pro: transparencia, optimizable por especialistas
- Con: SQL injection risk si no se usan prepared statements (bien hecho aquí con `db.prepare()`)

### 3. Roles estáticos en enum vs tabla
- Roles ('doctor'|'patient'|'admin') como CHECK constraint en BD
- Pro: simple, rápido
- Con: no extensible sin migración
- Decisión correcta para MVP

### 4. Alertas automáticas en createMetric()
- No hay job scheduler; alertas creadas síncronamente en insert
- Pro: datos siempre consistentes
- Con: POST metric es más lento (INSERT + lógica + INSERT alert)
- OK para escala actual

### 5. In-memory DB para tests
- `setDb()` permite inyectar DB en memoria en tests
- Pro: tests rápidos, aislados
- Con: BD real no se testa
- Podría mejorar con TestContainers pero es razonable

### 6. Validación en routes vs servicios
- Validación básica en routes (presence, format, enums)
- Lógica de negocio en servicios
- Pro: separación clara
- Con: duplicación en algunos casos (DTOs validados en dos lugares)

### 7. Auditoría genérica vs específica
- Middleware audit-logger captura POST/PUT/PATCH/DELETE
- Algunos endpoints (acknowledgeAlert) hacen logging adicional
- Decisión: audit-logger es genérico pero incompleto (no captura user_id)
- Mejor sería: todo en service layer con contexto de usuario

---

## Testing

- **Framework**: Vitest + supertest
- **Estrategia**: Unit + integration HTTP
- **Setup**: `tests/setup.ts` crea BD en memoria, helpers `createTestUser`, `createTestPatient`
- **Cobertura**: 
  - `alerts.test.ts` es exhaustivo (threshold boundaries, RBAC, 40+ casos)
  - `auth.test.ts` es básico (happy paths + credenciales)
  - `patients.test.ts` sin tests HTTP (solo service tests)
- **Config**: `vitest.config.ts` — forks mode para aislamiento

**Cómo ejecutar**:
```bash
npm test                 # Todos los tests
npm run test:watch       # Watch mode
npm run test:coverage    # Cobertura V8
```

---

## Database Schema

```
users
├── id (PK)
├── email (UNIQUE)
├── password_hash
├── role (CHECK: doctor|patient|admin)
├── name
└── created_at

patients
├── id (PK)
├── user_id (FK)
├── assigned_doctor_id (FK, nullable)
├── date_of_birth, gender, blood_type
├── allergies (JSON), emergency_contact, emergency_phone
└── created_at

appointments
├── id (PK)
├── patient_id (FK)
├── doctor_id (FK)
├── date_time, duration_minutes
├── status (CHECK: scheduled|confirmed|completed|cancelled)
├── reason, notes
└── created_at

health_metrics
├── id (PK)
├── patient_id (FK)
├── metric_type (CHECK: blood_pressure|glucose|weight|heart_rate|temperature|oxygen_saturation)
├── value, secondary_value (para sistólica/diastólica)
├── unit, recorded_at, recorded_by (FK, nullable)
├── notes
└── created_at

notifications
├── id (PK)
├── patient_id (FK)
├── type (CHECK: metric_warning|metric_critical|appointment_reminder|general)
├── title, message, severity (info|warning|critical)
├── read (0|1)
├── related_metric_id (FK, nullable)
└── created_at

alerts
├── id (PK)
├── patient_id (FK, ON DELETE CASCADE)
├── metric_id (FK, ON DELETE CASCADE)
├── metric_type, value, secondary_value
├── severity (CHECK: warning|critical)
├── acknowledged (0|1)
└── created_at

audit_log
├── id (PK)
├── user_id (FK, nullable)
├── action, resource, resource_id
├── details (JSON), ip_address
└── created_at
```

---

## Startup & Development

**Instalación**:
```bash
npm install
npm run db:seed        # Crea healthtrack.db con datos de ejemplo
npm run dev            # Hot-reload en localhost:3000
```

**Base de datos de ejemplo** (creada por seed.ts):
- 1 admin: admin@healthtrack.com / Admin123!
- 3 doctores: elena.martinez@, james.chen@, sarah.okonkwo@ (todos Doctor123!)
- 8 pacientes con historiales realistas

**Variables de entorno**:
```
PORT=3000                      (default)
DB_PATH=healthtrack.db         (default)
NODE_ENV=development           (default)
JWT_SECRET=<cambiar en prod>   (FIXME: actualmente hardcodeado)
```

---

## File Paths (Quick Reference)

```
src/
├── index.ts                              (entry point, Express app)
├── config.ts                             (config centralizado, FIXME JWT_SECRET)
├── auth/
│   ├── auth.service.ts                   (JWT + bcrypt)
│   ├── auth.middleware.ts                (authenticate, authorize)
│   ├── auth.routes.ts                    (POST /register, /login)
│   └── auth.types.ts
├── patients/
│   ├── patients.service.ts               (CRUD con RBAC, security bug)
│   ├── patients.routes.ts
│   ├── patients.validation.ts
│   └── patients.types.ts
├── health-metrics/
│   ├── metrics.service.ts                (N+1 issue, anomalía detection)
│   ├── metrics.routes.ts
│   ├── metrics.validation.ts
│   └── metrics.types.ts
├── alerts/
│   ├── alerts.service.ts                 (thresholds, acknowledgment + audit)
│   ├── alerts.routes.ts
│   └── alerts.types.ts
├── appointments/
│   ├── appointments.service.ts
│   ├── appointments.routes.ts
│   ├── appointments.validation.ts
│   └── appointments.types.ts
├── notifications/
│   ├── notifications.service.ts
│   ├── notifications.routes.ts
│   └── notifications.types.ts
├── middleware/
│   ├── audit-logger.ts                   (registra POST/PUT/PATCH/DELETE)
│   ├── error-handler.ts                  (global, FIXME SQL leak en dev)
│   └── rate-limiter.ts                   (100 req/min por IP)
└── database/
    ├── connection.ts                     (singleton + migrations)
    ├── migrations.ts                     (DDL)
    └── seed.ts                           (datos ejemplo)

tests/
├── setup.ts                              (DB en memoria, helpers)
├── auth.test.ts                          (JWT tests)
├── alerts.test.ts                        (exhaustive: 40+ cases)
└── patients.test.ts                      (service tests)

vitest.config.ts
tsconfig.json
package.json
README.md
CLAUDE.md (project instructions)
```

---

## Deuda Técnica Ordenada por Prioridad

1. **[P0 Security]** getPatientById() - doctores ven cualquier paciente
2. **[P0 Security]** JWT_SECRET hardcodeado - debe venir de env
3. **[P0 Security]** Error handler expone SQL internals en dev
4. **[P1 Performance]** getPatientSummary() N+1 queries
5. **[P2 Compliance]** Hard delete de pacientes (sin soft delete)
6. **[P2 Functional]** Validación blood_pressure sin secondary_value
7. **[P3 Testing]** Cobertura incompleta de pacientes y appointments
8. **[P3 Code Quality]** Duplicación de RBAC checks
