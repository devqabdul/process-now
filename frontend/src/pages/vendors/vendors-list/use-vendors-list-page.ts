import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { isSuccess, safeApiError } from '@api/process-backend';
import {
  createVendor,
  updateVendor,
  useVendors,
  type Vendor,
  vendorsKeys,
} from '@api/process-backend/vendors';
import type { VendorFormInput } from '@components/sections/vendors/vendor-form-dialog';
import { useMediaQuery } from '@hooks/use-media-query';
import { toMobileDigits } from '@utils/identifier';

// Long enough that typing a name doesn't fire a request per keystroke.
const SEARCH_DEBOUNCE_MS = 300;

export interface UseVendorsListPageResult {
  search: string;
  setSearch: (value: string) => void;
  vendors: Vendor[];
  target: Vendor | 'new' | null;
  showTable: boolean;
  isLoading: boolean;
  isError: boolean;
  openNew: () => void;
  openEdit: (vendor: Vendor) => void;
  closeDialog: () => void;
  save: (values: VendorFormInput) => Promise<{ ok: boolean; message?: string }>;
  saved: string | null;
  dismissSaved: () => void;
  setActive: (vendor: Vendor, isActive: boolean) => void;
  retry: () => void;
  clearSearch: () => void;
}

export const useVendorsListPage = (): UseVendorsListPageResult => {
  // state
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState<Vendor | 'new' | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  // wiring
  const queryClient = useQueryClient();
  const { data, isPending, isError, refetch } = useVendors(query ? { q: query } : {});
  // Tailwind's md: below it the same rows read better as cards.
  const showTable = useMediaQuery('(min-width: 48rem)');

  // derived
  const vendors = data ?? [];

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
  // so it needs no confirmation — the toast says what happened and the row says so too.
  const setActive = async (vendor: Vendor, isActive: boolean) => {
    try {
      const response = await updateVendor(vendor.id, { isActive });
      if (!isSuccess(response.data)) return;
      await queryClient.invalidateQueries({ queryKey: vendorsKeys.all });
      setSaved(
        isActive
          ? `${vendor.name} is active again.`
          : `${vendor.name} is retired. Their past orders and bills are untouched.`,
      );
    } catch (error) {
      safeApiError(error, {
        context: { page: 'vendors', action: 'setVendorActive' },
        onError: (err) => setSaved(err.message ?? 'Unable to change this vendor right now.'),
      });
    }
  };

  // effects
  useEffect(() => {
    const id = setTimeout(() => setQuery(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [search]);

  return {
    search,
    setSearch,
    vendors,
    target,
    showTable,
    isLoading: isPending,
    isError,
    openNew: () => {
      setSaved(null);
      setTarget('new');
    },
    openEdit: (vendor) => {
      setSaved(null);
      setTarget(vendor);
    },
    closeDialog: () => setTarget(null),
    save,
    saved,
    dismissSaved: () => setSaved(null),
    setActive: (vendor, isActive) => void setActive(vendor, isActive),
    retry: () => void refetch(),
    clearSearch: () => setSearch(''),
  };
};
