import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { fetchAllPages, isSuccess, safeApiError, usePagedList } from '@api/process-backend';
import {
  createVendor,
  getVendors,
  updateVendor,
  type Vendor,
  vendorsKeys,
} from '@api/process-backend/vendors';
import type { VendorFormInput } from '@components/sections/vendors/vendor-form-dialog';
import { buildVendorColumns } from '@components/sections/vendors/vendors-table';
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
import { toMobileDigits } from '@utils/identifier';

const SORT_KEYS = ['name', 'createdAt'];

export interface UseVendorsListPageResult {
  vendors: Vendor[];
  total: number;
  page: number;
  pageSize: number;
  q: string;
  sorting: SortingState;
  columns: DataTableColumn<Vendor>[];
  columnVisibility: ColumnVisibilityState;
  pickerColumns: PickerColumn[];
  target: Vendor | 'new' | null;
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
  openNew: () => void;
  openEdit: (vendor: Vendor) => void;
  closeDialog: () => void;
  save: (values: VendorFormInput) => Promise<{ ok: boolean; message?: string }>;
  saved: string | null;
  dismissSaved: () => void;
  // Set right after a retire, so the toast can put it back in one tap.
  undoRetire: (() => void) | null;
  setActive: (vendor: Vendor, isActive: boolean) => void;
  retry: () => void;
  clearSearch: () => void;
}

export const useVendorsListPage = (): UseVendorsListPageResult => {
  // state
  const [target, setTarget] = useState<Vendor | 'new' | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [retired, setRetired] = useState<{ item: Vendor; message: string } | null>(null);
  const [columnVisibility, setColumnVisibility] = usePersistedState<ColumnVisibilityState>(
    'pn.table.vendors.columns',
    {},
  );

  // wiring
  const queryClient = useQueryClient();
  const list = useListParams(SORT_KEYS, 'name');
  const filters = { ...(list.q ? { q: list.q } : {}), ...(list.apiSort && { sort: list.apiSort }) };
  // Tailwind's lg: below it the rows read better as cards that load more.
  const showTable = useMediaQuery('(min-width: 64rem)');
  const rows = usePagedList(
    vendorsKeys,
    { ...filters, page: list.page, pageSize: list.pageSize },
    showTable,
    list.setPage,
  );
  const { exportError, runExport } = useCsvExport('vendors');

  // callbacks
  const save = async (values: VendorFormInput) => {
    // Always sent, so clearing the field on an edit actually clears the address.
    const payload = {
      name: values.name.trim(),
      phone: toMobileDigits(values.phone),
      address: values.address.trim(),
    };
    try {
      const editing = target !== null && target !== 'new' ? target : null;
      const response = editing
        ? await updateVendor(editing.id, payload)
        : await createVendor(payload);
      if (!isSuccess(response.data)) return { ok: false, message: 'Unable to save this vendor.' };
      await queryClient.invalidateQueries({ queryKey: vendorsKeys.all });
      setTarget(null);
      return { ok: true };
    } catch (error) {
      let message = 'Unable to save this vendor right now.';
      safeApiError(error, {
        context: { page: 'vendors', action: target === 'new' ? 'createVendor' : 'updateVendor' },
        // A 422 names the field; anything else is a one-line failure above the buttons.
        onError: (err) => {
          message = Object.values(err.fields ?? {})[0] ?? err.message ?? message;
        },
      });
      return { ok: false, message };
    }
  };

  // Retiring a vendor is reversible and touches nothing they've already brought in,
  // so it takes one tap — and the toast offers Undo for a mis-tap.
  const setActive = async (vendor: Vendor, isActive: boolean) => {
    try {
      const response = await updateVendor(vendor.id, { isActive });
      if (!isSuccess(response.data)) return;
      await queryClient.invalidateQueries({ queryKey: vendorsKeys.all });
      const message = isActive
        ? `${vendor.name} is active again.`
        : `${vendor.name} is retired. Their past orders and bills are untouched.`;
      setRetired(isActive ? null : { item: vendor, message });
      setSaved(message);
    } catch (error) {
      safeApiError(error, {
        context: { page: 'vendors', action: 'setVendorActive' },
        onError: (err) => setSaved(err.message ?? 'Unable to change this vendor right now.'),
      });
    }
  };

  const openEdit = (vendor: Vendor) => {
    setSaved(null);
    setTarget(vendor);
  };

  const columns = buildVendorColumns({
    onEdit: openEdit,
    onSetActive: (vendor, isActive) => void setActive(vendor, isActive),
  });

  const exportCsv = () =>
    runExport(async () => exportRows(columns, await fetchAllPages(getVendors, filters)));

  return {
    vendors: rows.items,
    total: rows.total,
    page: list.page,
    pageSize: list.pageSize,
    q: list.q,
    sorting: list.sorting,
    columns,
    columnVisibility,
    pickerColumns: pickerColumns(columns, columnVisibility),
    target,
    showTable,
    isLoading: rows.isLoading,
    isRefreshing: rows.isRefreshing,
    isLoadingMore: rows.isLoadingMore,
    isError: rows.isError,
    exportError,
    setPage: list.setPage,
    setPageSize: list.setPageSize,
    setQ: list.setQ,
    setSorting: list.setSorting,
    setColumnVisibility,
    toggleColumn: (id, visible) =>
      setColumnVisibility((previous) => ({ ...previous, [id]: visible })),
    loadMore: rows.loadMore,
    exportCsv,
    openNew: () => {
      setSaved(null);
      setTarget('new');
    },
    openEdit,
    closeDialog: () => setTarget(null),
    save,
    saved,
    dismissSaved: () => {
      setSaved(null);
      setRetired(null);
    },
    // Only while the toast still shows the retire; a later message has nothing to undo.
    undoRetire:
      retired && saved === retired.message ? () => void setActive(retired.item, true) : null,
    setActive: (vendor, isActive) => void setActive(vendor, isActive),
    retry: rows.retry,
    clearSearch: () => list.setQ(''),
  };
};
