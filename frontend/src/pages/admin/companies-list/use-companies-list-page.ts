import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { fetchAllPages, isSuccess, safeApiError, usePagedList } from '@api/process-backend';
import {
  companiesKeys,
  getCompanies,
  resetAdminPassword,
  setCompanyActive,
} from '@api/process-backend/companies';
import { buildCompanyColumns } from '@components/sections/admin/companies-table';
import type { CompanyRow } from '@components/sections/admin/company-card';
import type { PickerColumn } from '@components/ui/column-picker';
import {
  type ColumnVisibilityState,
  type DataTableColumn,
  exportRows,
  pickerColumns,
  type SortingState,
} from '@components/ui/data-table';
import { useCsvExport } from '@hooks/use-csv-export';
import { useListParams } from '@hooks/use-list-params';
import { useMediaQuery } from '@hooks/use-media-query';
import { usePersistedState } from '@hooks/use-persisted-state';
import { formatCreatedOn } from '@utils/format/date';

const SORT_KEYS = ['createdAt', 'name'];

const toRow = <T extends { createdAt: string }>(company: T) => ({
  ...company,
  createdOn: formatCreatedOn(company.createdAt),
});

export interface UseCompaniesListPageResult {
  rows: CompanyRow[];
  total: number;
  page: number;
  pageSize: number;
  q: string;
  sorting: SortingState;
  columns: DataTableColumn<CompanyRow>[];
  columnVisibility: ColumnVisibilityState;
  pickerColumns: PickerColumn[];
  showTable: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  isError: boolean;
  exportError: string | null;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setQ: (q: string) => void;
  setSorting: (sorting: SortingState) => void;
  setColumnVisibility: (visibility: ColumnVisibilityState) => void;
  toggleColumn: (id: string, visible: boolean) => void;
  loadMore: () => void;
  exportCsv: () => Promise<void>;
  resetTarget: CompanyRow | null;
  showPassword: boolean;
  resetDone: string | null;
  dismissResetDone: () => void;
  deactivateTarget: CompanyRow | null;
  isDeactivating: boolean;
  deactivateError: string | null;
  openDeactivate: (company: CompanyRow) => void;
  closeDeactivate: () => void;
  confirmDeactivate: () => void;
  activate: (company: CompanyRow) => void;
  openReset: (company: CompanyRow) => void;
  closeReset: () => void;
  togglePassword: () => void;
  submitReset: (password: string) => Promise<{ ok: boolean; message?: string }>;
  retry: () => void;
  clearSearch: () => void;
}

export const useCompaniesListPage = (): UseCompaniesListPageResult => {
  // state
  const [resetTarget, setResetTarget] = useState<CompanyRow | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [resetDone, setResetDone] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<CompanyRow | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [columnVisibility, setColumnVisibility] = usePersistedState<ColumnVisibilityState>(
    'pn.table.companies.columns',
    {},
  );

  // wiring
  const queryClient = useQueryClient();
  const list = useListParams(SORT_KEYS, '-createdAt');
  const filters = { ...(list.q ? { q: list.q } : {}), ...(list.apiSort && { sort: list.apiSort }) };
  // Tailwind's lg: below it the rows read better as cards that load more.
  const showTable = useMediaQuery('(min-width: 64rem)');
  const companies = usePagedList(
    companiesKeys,
    { ...filters, page: list.page, pageSize: list.pageSize },
    showTable,
    list.setPage,
  );
  const { exportError, runExport } = useCsvExport('companies');

  // derived
  const rows = companies.items.map(toRow);

  // callbacks
  const submitReset = async (password: string) => {
    if (!resetTarget) return { ok: false };
    try {
      const response = await resetAdminPassword(resetTarget.id, password);
      if (!isSuccess(response.data)) {
        return { ok: false, message: 'Unable to change this password.' };
      }
      // The admin's sessions are gone; the list itself hasn't changed, but a
      // refetch keeps it honest if anything else moved.
      await queryClient.invalidateQueries({ queryKey: companiesKeys.all });
      setResetDone(
        `Password changed for ${response.data.data.admin} at ${resetTarget.name}. They are signed out everywhere.`,
      );
      setResetTarget(null);
      return { ok: true };
    } catch (error) {
      let message = 'Unable to change this password right now.';
      safeApiError(error, {
        context: { page: 'companies-list', action: 'resetAdminPassword' },
        onError: (err) => {
          message = Object.values(err.fields ?? {})[0] ?? err.message ?? message;
        },
      });
      return { ok: false, message };
    }
  };

  // Suspending and restoring share one call; only suspending needs the confirmation.
  const changeActive = async (company: CompanyRow, isActive: boolean) => {
    try {
      const response = await setCompanyActive(company.id, isActive);
      if (!isSuccess(response.data)) return 'Unable to change this company right now.';
      await queryClient.invalidateQueries({ queryKey: companiesKeys.all });
      setResetDone(
        isActive
          ? `${company.name} is active again. Its team can sign in.`
          : `${company.name} is deactivated. Nobody from it can sign in.`,
      );
      return null;
    } catch (error) {
      let message = 'Unable to change this company right now.';
      safeApiError(error, {
        context: { page: 'companies-list', action: 'setCompanyActive' },
        onError: (err) => {
          message = err.message ?? message;
        },
      });
      return message;
    }
  };

  const confirmDeactivate = () => {
    if (!deactivateTarget || isDeactivating) return;
    setIsDeactivating(true);
    setDeactivateError(null);
    void changeActive(deactivateTarget, false).then((message) => {
      setIsDeactivating(false);
      if (message) setDeactivateError(message);
      else setDeactivateTarget(null);
    });
  };

  const openDeactivate = (company: CompanyRow) => {
    setResetDone(null);
    setDeactivateError(null);
    setDeactivateTarget(company);
  };

  const openReset = (company: CompanyRow) => {
    setResetDone(null);
    setShowPassword(false);
    setResetTarget(company);
  };

  const activate = (company: CompanyRow) => void changeActive(company, true);

  const columns = buildCompanyColumns({
    onResetPassword: openReset,
    onDeactivate: openDeactivate,
    onActivate: activate,
  });

  const exportCsv = () =>
    runExport(async () =>
      exportRows(columns, (await fetchAllPages(getCompanies, filters)).map(toRow)),
    );

  return {
    rows,
    total: companies.total,
    page: list.page,
    pageSize: list.pageSize,
    q: list.q,
    sorting: list.sorting,
    columns,
    columnVisibility,
    pickerColumns: pickerColumns(columns, columnVisibility),
    showTable,
    isLoading: companies.isLoading,
    isRefreshing: companies.isRefreshing,
    isLoadingMore: companies.isLoadingMore,
    isError: companies.isError,
    exportError,
    setPage: list.setPage,
    setPageSize: list.setPageSize,
    setQ: list.setQ,
    setSorting: list.setSorting,
    setColumnVisibility,
    toggleColumn: (id, visible) =>
      setColumnVisibility((previous) => ({ ...previous, [id]: visible })),
    loadMore: companies.loadMore,
    exportCsv,
    resetTarget,
    showPassword,
    resetDone,
    dismissResetDone: () => setResetDone(null),
    deactivateTarget,
    isDeactivating,
    deactivateError,
    openDeactivate,
    closeDeactivate: () => setDeactivateTarget(null),
    confirmDeactivate,
    activate,
    openReset,
    closeReset: () => setResetTarget(null),
    togglePassword: () => setShowPassword((shown) => !shown),
    submitReset,
    retry: companies.retry,
    clearSearch: () => list.setQ(''),
  };
};
