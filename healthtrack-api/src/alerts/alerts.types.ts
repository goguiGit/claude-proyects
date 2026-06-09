import type { MetricType } from '../health-metrics/metrics.types';

export type AlertSeverity = 'warning' | 'critical';

export interface Alert {
  id: number;
  patient_id: number;
  metric_id: number;
  metric_type: MetricType;
  value: number;
  secondary_value: number | null;
  severity: AlertSeverity;
  acknowledged: number; // 0 | 1 (SQLite boolean)
  created_at: string;
  patient_name?: string;
}

export interface CreateAlertDTO {
  patient_id: number;
  metric_id: number;
  metric_type: MetricType;
  value: number;
  secondary_value?: number | null;
  severity: AlertSeverity;
}
