export interface CompanyRates {
  // ₹ per electricity unit, used for the dashboard's electricity cost.
  electricityRate: number;
  // Percent; applied only when the company has a GST number.
  gstRate: number;
}

export interface Settings {
  id: string;
  name: string;
  gstNo: string | null;
  // Shown in front of order and bill numbers ("FN" → FN-0001).
  numberPrefix: string | null;
  settings: CompanyRates;
}

export interface UpdateSettingsPayload {
  name?: string;
  // null clears the GST number, and with it the GST line on new bills.
  gstNo?: string | null;
  numberPrefix?: string | null;
  settings?: Partial<CompanyRates>;
}
