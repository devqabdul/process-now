import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { isSuccess, safeApiError } from '@api/process-backend';
import {
  type BillOn,
  createServiceType,
  type ServiceType,
  serviceTypesKeys,
  updateServiceType,
  useServiceTypes,
} from '@api/process-backend/service-types';
import type { ServiceTypeFormInput } from '@components/sections/service-types/service-type-form-dialog';
import { useMediaQuery } from '@hooks/use-media-query';

export interface UseServiceTypesListPageResult {
  search: string;
  setSearch: (value: string) => void;
  serviceTypes: ServiceType[];
  totalCount: number;
  target: ServiceType | 'new' | null;
  saved: string | null;
  showTable: boolean;
  isLoading: boolean;
  isError: boolean;
  openNew: () => void;
  openEdit: (serviceType: ServiceType) => void;
  closeDialog: () => void;
  dismissSaved: () => void;
  save: (values: ServiceTypeFormInput) => Promise<{ ok: boolean; message?: string }>;
  setActive: (serviceType: ServiceType, isActive: boolean) => void;
  retry: () => void;
  clearSearch: () => void;
}

export const useServiceTypesListPage = (): UseServiceTypesListPageResult => {
  // state
  const [search, setSearch] = useState('');
  const [target, setTarget] = useState<ServiceType | 'new' | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  // wiring
  const queryClient = useQueryClient();
  const { data, isPending, isError, refetch } = useServiceTypes();
  // Tailwind's md: below it the same rows read better as cards.
  const showTable = useMediaQuery('(min-width: 48rem)');

  // derived
  const all = data ?? [];
  const query = search.trim().toLowerCase();
  const serviceTypes = all.filter((serviceType) => serviceType.name.toLowerCase().includes(query));

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

  // Retiring a service only hides it from new orders — past orders keep their own copy of
  // the price — so it is reversible and needs no confirmation.
  const setActive = async (serviceType: ServiceType, isActive: boolean) => {
    try {
      const response = await updateServiceType(serviceType.id, { isActive });
      if (!isSuccess(response.data)) return;
      await queryClient.invalidateQueries({ queryKey: serviceTypesKeys.all });
      setSaved(
        isActive
          ? `${serviceType.name} is available for new orders again.`
          : `${serviceType.name} is retired. Orders already placed keep their price.`,
      );
    } catch (error) {
      safeApiError(error, {
        context: { page: 'service-types', action: 'setServiceTypeActive' },
        onError: (err) => setSaved(err.message ?? 'Unable to change this service right now.'),
      });
    }
  };

  return {
    search,
    setSearch,
    serviceTypes,
    totalCount: all.length,
    target,
    saved,
    showTable,
    isLoading: isPending,
    isError,
    openNew: () => {
      setSaved(null);
      setTarget('new');
    },
    openEdit: (serviceType) => {
      setSaved(null);
      setTarget(serviceType);
    },
    closeDialog: () => setTarget(null),
    dismissSaved: () => setSaved(null),
    save,
    setActive: (serviceType, isActive) => void setActive(serviceType, isActive),
    retry: () => void refetch(),
    clearSearch: () => setSearch(''),
  };
};
