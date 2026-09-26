import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { fetchAllPages, isSuccess, safeApiError, usePagedList } from '@api/process-backend';
import {
  type BillOn,
  createServiceType,
  deleteServiceType,
  getServiceTypes,
  type ServiceType,
  serviceTypesKeys,
  updateServiceType,
} from '@api/process-backend/service-types';
import type { ServiceTypeFormInput } from '@components/sections/service-types/service-type-form-dialog';
import { buildServiceTypeColumns } from '@components/sections/service-types/service-types-table';
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

const SORT_KEYS = ['name', 'basePrice', 'createdAt'];

export interface UseServiceTypesListPageResult {
  serviceTypes: ServiceType[];
  total: number;
  page: number;
  pageSize: number;
  q: string;
  sorting: SortingState;
  columns: DataTableColumn<ServiceType>[];
  columnVisibility: ColumnVisibilityState;
  pickerColumns: PickerColumn[];
  target: ServiceType | 'new' | null;
  saved: string | null;
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
  openEdit: (serviceType: ServiceType) => void;
  closeDialog: () => void;
  dismissSaved: () => void;
  // Set right after a retire, so the toast can put it back in one tap.
  undoRetire: (() => void) | null;
  save: (values: ServiceTypeFormInput) => Promise<{ ok: boolean; message?: string }>;
  setActive: (serviceType: ServiceType, isActive: boolean) => void;
  deleting: ServiceType | null;
  isDeleting: boolean;
  deleteError: string | null;
  askDelete: (serviceType: ServiceType) => void;
  closeDelete: () => void;
  confirmDelete: () => void;
  retry: () => void;
  clearSearch: () => void;
}

export const useServiceTypesListPage = (): UseServiceTypesListPageResult => {
  // state
  const [target, setTarget] = useState<ServiceType | 'new' | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [retired, setRetired] = useState<{ item: ServiceType; message: string } | null>(null);
  const [deleting, setDeleting] = useState<ServiceType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [columnVisibility, setColumnVisibility] = usePersistedState<ColumnVisibilityState>(
    'pn.table.service-types.columns',
    {},
  );

  // wiring
  const queryClient = useQueryClient();
  const list = useListParams(SORT_KEYS, 'name');
  const filters = { ...(list.q ? { q: list.q } : {}), ...(list.apiSort && { sort: list.apiSort }) };
  // Tailwind's lg: below it the rows read better as cards that load more.
  const showTable = useMediaQuery('(min-width: 64rem)');
  const rows = usePagedList(
    serviceTypesKeys,
    { ...filters, page: list.page, pageSize: list.pageSize },
    showTable,
    list.setPage,
  );
  const { exportError, runExport } = useCsvExport('service-types');

  // callbacks
  const save = async (values: ServiceTypeFormInput) => {
    const editing = target !== null && target !== 'new' ? target : null;
    // The API takes numbers; the form holds what was typed.
    const payload = {
      name: values.name.trim(),
      unit: values.unit.trim(),
      basePrice: Number(values.basePrice),
      baseCost: Number(values.baseCost),
      billOn: values.billOn as BillOn,
    };
    try {
      const response = editing
        ? await updateServiceType(editing.id, { ...payload, isActive: values.isActive })
        : await createServiceType(payload);
      if (!isSuccess(response.data)) return { ok: false, message: 'Unable to save this service.' };
      await queryClient.invalidateQueries({ queryKey: serviceTypesKeys.all });
      setTarget(null);
      setSaved(
        editing ? `${payload.name} updated.` : `${payload.name} is ready to use on new orders.`,
      );
      return { ok: true };
    } catch (error) {
      let message = 'Unable to save this service right now.';
      safeApiError(error, {
        context: {
          page: 'service-types',
          action: editing ? 'updateServiceType' : 'createServiceType',
        },
        // A 422 names the field; anything else is a one-line failure above the buttons.
        onError: (err) => {
          message = Object.values(err.fields ?? {})[0] ?? err.message ?? message;
        },
      });
      return { ok: false, message };
    }
  };

  // Retiring a service only hides it from new orders (past orders keep their price), so it
  // takes one tap — and the toast offers Undo for a mis-tap.
  const setActive = async (serviceType: ServiceType, isActive: boolean) => {
    try {
      const response = await updateServiceType(serviceType.id, { isActive });
      if (!isSuccess(response.data)) return;
      await queryClient.invalidateQueries({ queryKey: serviceTypesKeys.all });
      const message = isActive
        ? `${serviceType.name} is available for new orders again.`
        : `${serviceType.name} is retired. Orders already placed keep their price.`;
      setRetired(isActive ? null : { item: serviceType, message });
      setSaved(message);
    } catch (error) {
      safeApiError(error, {
        context: { page: 'service-types', action: 'setServiceTypeActive' },
        onError: (err) => setSaved(err.message ?? 'Unable to change this service right now.'),
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const response = await deleteServiceType(deleting.id);
      if (!isSuccess(response.data)) {
        setDeleteError('Unable to delete this service.');
        return;
      }
      await queryClient.invalidateQueries({ queryKey: serviceTypesKeys.all });
      setSaved(`${deleting.name} deleted.`);
      setDeleting(null);
    } catch (error) {
      safeApiError(error, {
        context: { page: 'service-types', action: 'deleteServiceType' },
        onError: (err) => setDeleteError(err.message ?? 'Unable to delete this service.'),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const openEdit = (serviceType: ServiceType) => {
    setSaved(null);
    setTarget(serviceType);
  };

  const askDelete = (serviceType: ServiceType) => {
    setSaved(null);
    setDeleteError(null);
    setDeleting(serviceType);
  };

  const columns = buildServiceTypeColumns({
    onEdit: openEdit,
    onSetActive: (serviceType, isActive) => void setActive(serviceType, isActive),
    onDelete: askDelete,
  });

  const exportCsv = () =>
    runExport(async () => exportRows(columns, await fetchAllPages(getServiceTypes, filters)));

  return {
    serviceTypes: rows.items,
    total: rows.total,
    page: list.page,
    pageSize: list.pageSize,
    q: list.q,
    sorting: list.sorting,
    columns,
    columnVisibility,
    pickerColumns: pickerColumns(columns, columnVisibility),
    target,
    saved,
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
    dismissSaved: () => {
      setSaved(null);
      setRetired(null);
    },
    // Only while the toast still shows the retire; a later message has nothing to undo.
    undoRetire:
      retired && saved === retired.message ? () => void setActive(retired.item, true) : null,
    save,
    setActive: (serviceType, isActive) => void setActive(serviceType, isActive),
    deleting,
    isDeleting,
    deleteError,
    askDelete,
    closeDelete: () => setDeleting(null),
    confirmDelete: () => void confirmDelete(),
    retry: rows.retry,
    clearSearch: () => list.setQ(''),
  };
};
