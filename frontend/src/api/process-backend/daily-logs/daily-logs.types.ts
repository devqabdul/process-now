export interface DailyLog {
  id: string;
  // YYYY-MM-DD in the business timezone.
  logDate: string;
  machineHours: string;
  electricityUnits: string;
  notes: string | null;
}

export interface DailyLogsQuery {
  // Defaults: `to` is today, `from` is 29 days earlier.
  from?: string;
  to?: string;
}

export interface UpsertDailyLogPayload {
  machineHours: number;
  electricityUnits: number;
  notes?: string;
}
