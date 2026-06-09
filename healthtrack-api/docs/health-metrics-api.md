# Health Metrics API Documentation

Endpoints para gestionar métricas de salud de pacientes. Incluye creación de registros, consulta de históricos y análisis de anomalías automáticas.

---

## Autenticación

Todos los endpoints requieren un token JWT válido en el encabezado `Authorization: Bearer <token>`.

Roles autorizados: `admin`, `doctor`, `patient`

---

## Tipos de Métricas

| Tipo | Unidad | Descripción | Rango Normal | Warning | Crítico |
|------|--------|-------------|--------------|---------|---------|
| `blood_pressure` | mmHg | Presión sistólica | 90–120 | 80–90 / 121–140 | <80 / >140 |
| `glucose` | mg/dL | Glucosa en sangre (ayunas) | 70–100 | 54–69 / 101–125 | <54 / >125 |
| `heart_rate` | bpm | Ritmo cardíaco | 60–100 | 50–59 / 101–120 | <50 / >120 |
| `temperature` | °C | Temperatura corporal | 36.1–37.2 | 35.5–36.0 / 37.3–38.0 | <35.5 / >38.0 |
| `oxygen_saturation` | % | Saturación de oxígeno | 95–100 | 90–94 | <90 |
| `weight` | kg | Peso corporal | N/A | N/A | N/A (no genera alertas) |

---

## Endpoints

### 1. Obtener métricas de un paciente

**GET** `/api/health-metrics/:patientId`

Recupera el histórico de métricas de salud de un paciente con filtros opcionales.

#### Parámetros

| Parámetro | Ubicación | Tipo | Obligatorio | Descripción |
|-----------|-----------|------|-------------|-------------|
| `patientId` | Path | number | Sí | ID del paciente |
| `type` | Query | string | No | Filtrar por tipo de métrica (ej: `blood_pressure`) |
| `dateFrom` | Query | string (ISO 8601) | No | Fecha inicial (ej: `2026-01-01T00:00`) |
| `dateTo` | Query | string (ISO 8601) | No | Fecha final (ej: `2026-01-31T23:59`) |

#### Validación

- `patientId` debe ser un entero positivo válido
- Si `patientId` es inválido (ej: no es número), devuelve `400`

#### Respuesta exitosa (200)

```json
{
  "data": [
    {
      "id": 42,
      "patient_id": 5,
      "metric_type": "blood_pressure",
      "value": 135,
      "secondary_value": 85,
      "unit": "mmHg",
      "recorded_at": "2026-01-15T10:30:00",
      "recorded_by": 3,
      "recorded_by_name": "Elena Martínez",
      "notes": "Paciente refiere estrés laboral",
      "created_at": "2026-01-15T10:35:42"
    },
    {
      "id": 41,
      "patient_id": 5,
      "metric_type": "blood_pressure",
      "value": 128,
      "secondary_value": 78,
      "unit": "mmHg",
      "recorded_at": "2026-01-14T09:15:00",
      "recorded_by": 3,
      "recorded_by_name": "Elena Martínez",
      "notes": null,
      "created_at": "2026-01-14T09:20:15"
    }
  ],
  "count": 2
}
```

#### Errores

| Código | Escenario | Respuesta |
|--------|-----------|-----------|
| 400 | `patientId` no es un número válido | `{ "error": "Invalid patientId" }` |
| 401 | Token faltante o inválido | `{ "error": "No token provided" }` o `{ "error": "Invalid or expired token" }` |
| 500 | Error interno al obtener métricas | `{ "error": "Failed to fetch metrics" }` |

#### Ejemplos

```bash
# Obtener todas las métricas del paciente 5
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/health-metrics/5

# Filtrar por tipo de métrica
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/health-metrics/5?type=blood_pressure"

# Filtrar por rango de fechas
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/health-metrics/5?dateFrom=2026-01-01T00:00&dateTo=2026-01-31T23:59"

# Combinar filtros
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/health-metrics/5?type=glucose&dateFrom=2026-01-01T00:00"
```

---

### 2. Obtener resumen de métricas de un paciente

**GET** `/api/health-metrics/:patientId/summary`

Calcula estadísticas y tendencias de todas las métricas de un paciente.

#### Parámetros

| Parámetro | Ubicación | Tipo | Obligatorio | Descripción |
|-----------|-----------|------|-------------|-------------|
| `patientId` | Path | number | Sí | ID del paciente |

#### Validación

- `patientId` debe ser un entero positivo válido

#### Comportamiento especial

Este endpoint analiza el histórico de métricas y calcula:

- **Última medición**: El valor más reciente registrado
- **Promedio**: Media aritmética de todos los valores registrados
- **Mínimo/Máximo**: Valores extremos en el histórico
- **Tendencia**: `rising`, `falling` o `stable`
  - Se calcula comparando el promedio de los últimos 3 registros vs. los 3 anteriores
  - Se considera tendencia significativa si la diferencia es mayor al 3% del valor anterior
- **Estado**: `normal`, `warning` o `critical` basado en la última medición
- Solo incluye métricas que tienen al menos 1 registro

#### Respuesta exitosa (200)

```json
{
  "data": [
    {
      "metric_type": "blood_pressure",
      "latest_value": 135,
      "latest_secondary_value": 85,
      "latest_recorded_at": "2026-01-15T10:30:00",
      "avg_value": 122.5,
      "min_value": 110,
      "max_value": 145,
      "count": 10,
      "trend": "rising",
      "status": "warning"
    },
    {
      "metric_type": "glucose",
      "latest_value": 98,
      "latest_secondary_value": null,
      "latest_recorded_at": "2026-01-15T09:00:00",
      "avg_value": 92.3,
      "min_value": 75,
      "max_value": 115,
      "count": 8,
      "trend": "stable",
      "status": "normal"
    },
    {
      "metric_type": "weight",
      "latest_value": 78.5,
      "latest_secondary_value": null,
      "latest_recorded_at": "2026-01-10T08:00:00",
      "avg_value": 79.2,
      "min_value": 77.0,
      "max_value": 81.5,
      "count": 5,
      "trend": "falling",
      "status": "normal"
    }
  ]
}
```

#### Errores

| Código | Escenario | Respuesta |
|--------|-----------|-----------|
| 400 | `patientId` no es un número válido | `{ "error": "Invalid patientId" }` |
| 401 | Token faltante o inválido | `{ "error": "No token provided" }` o `{ "error": "Invalid or expired token" }` |
| 500 | Error interno al calcular resumen | `{ "error": "Failed to fetch summary" }` |

#### Ejemplos

```bash
# Obtener resumen de métricas
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/health-metrics/5/summary
```

#### Notas técnicas

- **DEBT (Performance)**: Actualmente realiza una query separada para cada tipo de métrica (N+1 queries). Con muchos pacientes, esto degradará notablemente el rendimiento. Se recomienda usar `GROUP BY` para obtener todos los resúmenes en una única consulta.

---

### 3. Crear métrica de salud

**POST** `/api/health-metrics`

Registra una nueva métrica de salud para un paciente. Si la métrica se encuentra fuera de rango normal, genera automáticamente una notificación de alerta.

#### Cuerpo de solicitud

```json
{
  "patient_id": 5,
  "metric_type": "blood_pressure",
  "value": 135,
  "secondary_value": 85,
  "unit": "mmHg",
  "recorded_at": "2026-01-15T10:30:00",
  "notes": "Paciente refiere estrés laboral"
}
```

#### Parámetros

| Parámetro | Tipo | Obligatorio | Descripción | Validación |
|-----------|------|-------------|-------------|-----------|
| `patient_id` | number | Sí | ID del paciente a quien pertenece la métrica | Entero positivo |
| `metric_type` | string | Sí | Tipo de métrica | Uno de: `blood_pressure`, `glucose`, `heart_rate`, `temperature`, `oxygen_saturation`, `weight` |
| `value` | number | Sí | Valor principal de la métrica | Número positivo >= 0 |
| `secondary_value` | number | No | Valor secundario (ej: presión diastólica para tensión) | Número positivo >= 0 |
| `unit` | string | Sí | Unidad de medida | Debe corresponder al tipo de métrica (ej: `mmHg` para presión, `mg/dL` para glucosa) |
| `recorded_at` | string | Sí | Fecha y hora del registro | Formato ISO 8601 (ej: `2026-01-15T10:30:00`) |
| `notes` | string | No | Notas adicionales | Texto libre (ej: observaciones del médico) |

#### Validación

- `patient_id` es obligatorio
- `metric_type` es obligatorio y debe ser un valor válido
- `value` es obligatorio, debe ser un número y >= 0
- `unit` es obligatorio
- `recorded_at` es obligatorio y debe cumplir formato ISO 8601: `YYYY-MM-DDTHH:MM`
- `secondary_value` debe ser un número positivo si se proporciona
- No se valida que `secondary_value` exista cuando `metric_type` es `blood_pressure` (DEBT)

#### Comportamiento automático

**Detección de anomalías**: Después de crear la métrica, se ejecuta la función `checkMetricStatus()` que clasifica el valor en:

- **normal**: dentro del rango normal
- **warning**: fuera del rango normal pero no crítico
- **critical**: fuera del rango crítico

Si el estado es `warning` o `critical`, se genera automáticamente una notificación con:
- Tipo: `metric_warning` (si warning) o `metric_critical` (si crítico)
- Título: Nombre de la métrica + severidad (ej: "Presión arterial crítico")
- Mensaje: Descripción genérica de la anomalía
- Severidad: `warning` o `critical`
- Relación: Se vincula con `related_metric_id` (ID de la métrica creada)

**Nota técnica (DEBT)**: El mensaje de notificación no incluye el valor específico que disparó la alerta. Se recomienda incluir el valor numérico y la unidad (ej: "Glucosa: 145 mg/dL (crítico)" en lugar de solo "Nivel de glucosa fuera de rango").

#### Respuesta exitosa (201)

```json
{
  "data": {
    "id": 42,
    "patient_id": 5,
    "metric_type": "blood_pressure",
    "value": 135,
    "secondary_value": 85,
    "unit": "mmHg",
    "recorded_at": "2026-01-15T10:30:00",
    "recorded_by": 3,
    "recorded_by_name": "Elena Martínez",
    "notes": "Paciente refiere estrés laboral",
    "created_at": "2026-01-15T10:35:42"
  }
}
```

#### Errores

| Código | Escenario | Respuesta |
|--------|-----------|-----------|
| 400 | Campo obligatorio faltante | `{ "error": "patient_id is required" }` |
| 400 | `metric_type` inválido | `{ "error": "metric_type must be one of: blood_pressure, glucose, weight, heart_rate, temperature, oxygen_saturation" }` |
| 400 | `value` no es número | `{ "error": "value must be a number" }` |
| 400 | `value` es negativo | `{ "error": "value must be positive" }` |
| 400 | `recorded_at` no cumple formato ISO 8601 | `{ "error": "recorded_at must be ISO 8601 format" }` |
| 401 | Token faltante o inválido | `{ "error": "No token provided" }` o `{ "error": "Invalid or expired token" }` |
| 500 | Error al insertar en base de datos | `{ "error": "descripción del error de DB" }` |

#### Ejemplos

```bash
# Crear registro de presión arterial elevada (genera alerta warning)
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": 5,
    "metric_type": "blood_pressure",
    "value": 135,
    "secondary_value": 85,
    "unit": "mmHg",
    "recorded_at": "2026-01-15T10:30:00",
    "notes": "Paciente refiere estrés laboral"
  }' \
  http://localhost:3000/api/health-metrics

# Crear registro de glucosa crítica (genera alerta critical)
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": 8,
    "metric_type": "glucose",
    "value": 140,
    "unit": "mg/dL",
    "recorded_at": "2026-01-15T14:00:00"
  }' \
  http://localhost:3000/api/health-metrics

# Crear registro de peso (no genera alertas)
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": 5,
    "metric_type": "weight",
    "value": 78.5,
    "unit": "kg",
    "recorded_at": "2026-01-15T08:00:00"
  }' \
  http://localhost:3000/api/health-metrics

# Crear registro de temperatura anormal
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": 3,
    "metric_type": "temperature",
    "value": 38.5,
    "unit": "°C",
    "recorded_at": "2026-01-15T15:00:00",
    "notes": "Paciente presenta síntomas de gripe"
  }' \
  http://localhost:3000/api/health-metrics
```

#### Información sensible (PII)

El campo `notes` puede contener información médica sensible. Todos los registros que incluyen esta métrica son auditados automáticamente mediante el middleware `audit-logger.ts`.

---

## Información de Identificación Personal (PII)

Todos los endpoints con métricas incluyen:
- **`patient_id`**: Identificador del paciente (mapeo a usuario específico)
- **`recorded_by_name`**: Nombre completo del profesional que registró la métrica
- **`notes`**: Información clínica sensible

Estos datos son auditados en cada lectura/escritura según el middleware de auditoría.

---

## Detalle de la función checkMetricStatus()

Esta función classifica automáticamente cualquier métrica según su valor:

```
blood_pressure:
  - Normal: 90 ≤ valor ≤ 120
  - Warning: 81-89 o 121-140
  - Critical: < 80 o > 140

glucose:
  - Normal: 70 ≤ valor ≤ 100
  - Warning: 54-69 o 101-125
  - Critical: < 54 o > 125

heart_rate:
  - Normal: 60 ≤ valor ≤ 100
  - Warning: 50-59 o 101-120
  - Critical: < 50 o > 120

temperature:
  - Normal: 36.1 ≤ valor ≤ 37.2
  - Warning: 35.5-36.0 o 37.3-38.0
  - Critical: < 35.5 o > 38.0

oxygen_saturation:
  - Normal: 95 ≤ valor ≤ 100
  - Warning: 90-94
  - Critical: < 90

weight:
  - Siempre "normal" (no genera alertas)
```

---

## Control de Acceso

Todos los endpoints requieren autenticación JWT. El sistema actualmente **no implementa autorización granular por rol** en health-metrics (todos los roles autenticados pueden acceder), pero la arquitectura permite agregar validaciones como:

- `admin`: acceso a todas las métricas de todos los pacientes
- `doctor`: acceso solo a métricas de sus pacientes asignados
- `patient`: acceso solo a sus propias métricas

---

## Notas sobre limitaciones actuales

1. **N+1 Queries en summary**: La función `getPatientSummary()` realiza una query por cada tipo de métrica. Se recomienda usar agregación SQL.
2. **Mensajes de alerta genéricos**: Las notificaciones automáticas no incluyen valores específicos.
3. **Sin validación secundaria**: `blood_pressure` no requiere `secondary_value`, aunque médicamente no tiene sentido sin la presión diastólica.
4. **Sin control de acceso por rol**: Los endpoints no validan relación médico-paciente ni pertenencia de la métrica.
