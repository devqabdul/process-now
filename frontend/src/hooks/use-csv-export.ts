import { useState } from 'react';

import { safeApiError } from '@api/process-backend';
import { type CsvValue, downloadCsv, toCsv } from '@utils/csv';
import { todayIso } from '@utils/format/date';

/** Runs a list's export and names the file `<name>-YYYY-MM-DD.csv`; a failure is kept to show. */
export const useCsvExport = (name: string) => {
  // state
  const [exportError, setExportError] = useState<string | null>(null);

  // callbacks
  const runExport = async (build: () => Promise<{ headers: string[]; rows: CsvValue[][] }>) => {
    setExportError(null);
    try {
      const { headers, rows } = await build();
      downloadCsv(`${name}-${todayIso()}.csv`, toCsv(headers, rows));
    } catch (error) {
      safeApiError(error, {
        context: { page: name, action: 'export' },
        onError: (err) =>
          setExportError(
            err.error_type === 'network'
              ? 'The export stopped. Check your connection and try again.'
              : (err.message ?? 'The export failed. Try again in a moment.'),
          ),
      });
    }
  };

  return { exportError, runExport };
};
