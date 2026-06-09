# Alerts API Documentation

## Overview

The Alerts API manages system-generated alerts triggered by health metrics that fall outside normal ranges. Alerts are created automatically when a patient's health metric is recorded with a warning or critical severity, and can be acknowledged by authorized users.

---

## Endpoints

### GET /api/alerts/:patientId

Retrieves all alerts for a specific patient, ordered by creation date (most recent first).

**Authentication:** Required

**Authorized Roles:**
- `admin` — can access alerts for any patient
- `doctor` — can only access alerts for their assigned patients
- `patient` — can only access their own alerts

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | integer | Yes | The ID of the patient. Must be a valid positive integer. |

**Success Response:**

**Status Code:** `200 OK`

**Response Body:**

```json
{
  "data": [
    {
      "id": 5,
      "patient_id": 1,
      "metric_id": 42,
      "metric_type": "blood_pressure",
      "value": 145,
      "secondary_value": 92,
      "severity": "critical",
      "acknowledged": 0,
      "created_at": "2026-06-09T10:30:00.000Z",
      "patient_name": "Carlos Ruiz"
    },
    {
      "id": 4,
      "patient_id": 1,
      "metric_id": 41,
      "metric_type": "glucose",
      "value": 135,
      "secondary_value": null,
      "severity": "warning",
      "acknowledged": 1,
      "created_at": "2026-06-09T09:15:00.000Z",
      "patient_name": "Carlos Ruiz"
    }
  ],
  "count": 2
}
```

**Response Fields:**

- `id` — Unique alert identifier (integer)
- `patient_id` — Foreign key to patients table (integer)
- `metric_id` — Foreign key to the health_metrics entry that triggered this alert (integer)
- `metric_type` — Type of health metric ('blood_pressure', 'glucose', 'heart_rate', 'temperature', 'oxygen_saturation')
- `value` — The primary metric value that triggered the alert (number). For blood_pressure, this is systolic
- `secondary_value` — Additional metric value (can be null). For blood_pressure, this is diastolic
- `severity` — Alert severity level: 'warning' or 'critical' (string)
- `acknowledged` — Flag indicating if alert has been reviewed (0 = not acknowledged, 1 = acknowledged)
- `created_at` — Timestamp when alert was created (ISO 8601 string)
- `patient_name` — Patient's full name (string, included in response)

**Error Responses:**

**Status Code:** `400 Bad Request`

Occurs when the patient ID parameter is invalid (not a valid integer).

```json
{
  "error": "Invalid patient id"
}
```

**Status Code:** `401 Unauthorized`

Occurs when the request lacks a valid JWT token.

```json
{
  "error": "Missing or invalid token"
}
```

**Status Code:** `403 Forbidden**

Occurs when the authenticated user does not have permission to access alerts for the specified patient.

- A patient can only access their own alerts
- A doctor can only access alerts for their assigned patients
- Only admins can access any patient's alerts

```json
{
  "error": "Access denied"
}
```

---

### PATCH /api/alerts/:id/acknowledge

Marks an alert as acknowledged by the requesting user. This operation is idempotent for the acknowledging user and creates an audit log entry.

**Authentication:** Required

**Authorized Roles:**
- `admin` — can acknowledge alerts for any patient
- `doctor` — can only acknowledge alerts for their assigned patients
- `patient` — can only acknowledge their own alerts

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | The ID of the alert to acknowledge. Must be a valid positive integer. |

**Request Body:**

None. This endpoint does not accept a request body.

**Success Response:**

**Status Code:** `200 OK`

**Response Body:**

```json
{
  "message": "Alert acknowledged"
}
```

**Audit Logging:**

When an alert is successfully acknowledged, an entry is automatically created in the audit_log table with:
- `action`: "ACKNOWLEDGE_ALERT"
- `resource`: "alerts"
- `resource_id`: the alert ID
- `details`: JSON object containing `{ patient_id, severity, role }`

This ensures compliance auditing of sensitive health-related operations.

**Error Responses:**

**Status Code:** `400 Bad Request`

Occurs when the alert ID parameter is invalid (not a valid integer).

```json
{
  "error": "Invalid alert id"
}
```

**Status Code:** `401 Unauthorized`

Occurs when the request lacks a valid JWT token.

```json
{
  "error": "Missing or invalid token"
}
```

**Status Code:** `404 Not Found`

Occurs when the alert does not exist or the requesting user does not have permission to access it.

- A patient cannot access alerts for other patients
- A doctor cannot access alerts for patients not assigned to them
- The alert ID may not exist in the database

```json
{
  "error": "Alert not found or access denied"
}
```

**Status Code:** `409 Conflict`

Occurs when attempting to acknowledge an alert that is already acknowledged.

```json
{
  "error": "Alert already acknowledged"
}
```

---

## Alert Generation Logic

### When Alerts Are Created

Alerts are **automatically created** when a health metric is recorded with a severity level of "warning" or "critical". This happens synchronously within the `createMetric()` function in the metrics service.

The alert generation process:

1. A health metric is submitted via POST /api/health-metrics
2. The metric's severity is computed using `computeAlertSeverity()`
3. If severity is not 'normal':
   - An alert record is inserted into the database
   - A notification is also created for display to relevant users
4. For blood pressure metrics, both systolic and diastolic values are evaluated; the worse severity is used

### Severity Thresholds

Alert severity is determined by comparing the recorded value against defined ranges. For each metric type, there are three possible statuses:

- **Normal** — value is within the safe range (no alert created)
- **Warning** — value is outside normal range but not critical (alert created)
- **Critical** — value is dangerously outside normal range (alert created)

#### Blood Pressure (mmHg)

| Status | Systolic | Diastolic |
|--------|----------|-----------|
| Normal | 90–120 | 60–80 |
| Warning | 121–140 or 80–89 | 81–90 or 50–59 |
| Critical | >140 or <80 | >90 or <50 |

**Special handling:** For blood pressure, the alert uses the **worst** severity between systolic and diastolic. If systolic is critical and diastolic is normal, the alert severity is critical.

#### Glucose (mg/dL, fasting)

| Status | Range |
|--------|-------|
| Normal | 70–100 |
| Warning | 101–125 or 54–69 |
| Critical | >125 or <54 |

**Clinical note:** Glucose <54 mg/dL represents hypoglycemia and is immediately dangerous.

#### Heart Rate (bpm)

| Status | Range |
|--------|-------|
| Normal | 60–100 |
| Warning | 101–120 or 50–59 |
| Critical | >120 or <50 |

#### Temperature (°C)

| Status | Range |
|--------|-------|
| Normal | 36.1–37.2 |
| Warning | 37.3–38.0 or 35.5–36.0 |
| Critical | >38.0 or <35.5 |

#### Oxygen Saturation (%)

| Status | Range |
|--------|-------|
| Normal | 95–100 |
| Warning | 90–94 |
| Critical | <90 |

**Clinical note:** SpO2 <90% indicates hypoxemia and requires immediate attention.

#### Weight (kg)

**No alerts are generated for weight measurements.** Weight is recorded for tracking purposes only and does not trigger alerts regardless of values.

---

## Examples

### Example 1: Retrieve Alerts as Doctor

Retrieve all unacknowledged alerts for an assigned patient.

```bash
curl -X GET "http://localhost:3000/api/alerts/1" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsInJvbGUiOiJkb2N0b3IifQ..." \
  -H "Content-Type: application/json"
```

**Response:**

```json
{
  "data": [
    {
      "id": 5,
      "patient_id": 1,
      "metric_id": 42,
      "metric_type": "blood_pressure",
      "value": 145,
      "secondary_value": 92,
      "severity": "critical",
      "acknowledged": 0,
      "created_at": "2026-06-09T10:30:00.000Z",
      "patient_name": "Carlos Ruiz"
    }
  ],
  "count": 1
}
```

### Example 2: Retrieve Own Alerts as Patient

A patient accessing only their own alerts.

```bash
curl -X GET "http://localhost:3000/api/alerts/3" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjgsInJvbGUiOiJwYXRpZW50In0..." \
  -H "Content-Type: application/json"
```

**Response:**

```json
{
  "data": [
    {
      "id": 12,
      "patient_id": 3,
      "metric_id": 89,
      "metric_type": "glucose",
      "value": 135,
      "secondary_value": null,
      "severity": "warning",
      "acknowledged": 0,
      "created_at": "2026-06-09T11:45:00.000Z",
      "patient_name": "Sofia Rodriguez"
    }
  ],
  "count": 1
}
```

### Example 3: Acknowledge an Alert

Mark a specific alert as acknowledged.

```bash
curl -X PATCH "http://localhost:3000/api/alerts/5/acknowledge" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsInJvbGUiOiJkb2N0b3IifQ..." \
  -H "Content-Type: application/json"
```

**Response:**

```json
{
  "message": "Alert acknowledged"
}
```

**Attempting to acknowledge again:**

```bash
curl -X PATCH "http://localhost:3000/api/alerts/5/acknowledge" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsInJvbGUiOiJkb2N0b3IifQ..." \
  -H "Content-Type: application/json"
```

**Response:**

```json
{
  "error": "Alert already acknowledged"
}
```

---

## PII and Data Privacy

The following fields in Alert responses contain Protected Health Information (PHI):

- `patient_name` — Patient's full name (included in list responses)
- `value`, `secondary_value` — Specific health metric readings (PII under HIPAA)
- `metric_type` — Type of health condition being monitored
- `severity` — Indicates severity of health condition

**Access Control:**
- Alerts are strictly filtered by role and assigned relationships
- Patients can only access their own alerts
- Doctors can only access alerts for their assigned patients
- Audit logging tracks all acknowledge operations for compliance

---

## Rate Limiting

Alert endpoints are subject to the same rate limiting as other API endpoints. See the general API documentation for rate limiting policies.

---

## Related Endpoints

- **POST /api/health-metrics** — Records a new health metric (may trigger alert creation)
- **GET /api/patients/:patientId** — Retrieve patient information
- **GET /api/notifications** — Retrieve notifications (alerts also generate notifications)
