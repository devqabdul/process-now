import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { isSuccess, safeApiError } from '@api/process-backend';
import {
  companiesKeys,
  resetAdminPassword,
  setCompanyActive,
  useCompanies,
} from '@api/process-backend/companies';
import type { CompanyRow } from '@components/sections/admin/company-card';
import { useMediaQuery } from '@hooks/use-media-query';
import { formatCreatedOn } from '@utils/format/date';

export interface UseCompaniesListPageResult {
  search: string;
  setSearch: (value: string) => void;
  rows: CompanyRow[];
  totalCount: number;
  showTable: boolean;
  isLoading: boolean;
  isError: boolean;
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
  const [search, setSearch] = useState('');
  const [resetTarget, setResetTarget] = useState<CompanyRow | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [resetDone, setResetDone] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<CompanyRow | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  // wiring
  const queryClient = useQueryClient();
  const { data, isPending, isError, refetch } = useCompanies();
  // Tailwind's md: below it the same rows read better as cards.
  const showTable = useMediaQuery('(min-width: 48rem)');

  // derived
  const companies = data ?? [];
  const query = search.trim().toLowerCase();
  const rows = companies
    .filter((company) => company.name.toLowerCase().includes(query))
    .map((company) => ({ ...company, createdOn: formatCreatedOn(company.createdAt) }));

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

  const retry = () => void refetch();
  const clearSearch = () => setSearch('');

  return {
    search,
    setSearch,
    rows,
    totalCount: companies.length,
    showTable,
    isLoading: isPending,
    isError,
    resetTarget,
    showPassword,
    resetDone,
    dismissResetDone: () => setResetDone(null),
    deactivateTarget,
    isDeactivating,
    deactivateError,
    openDeactivate: (company: CompanyRow) => {
      setResetDone(null);
      setDeactivateError(null);
      setDeactivateTarget(company);
    },
    closeDeactivate: () => setDeactivateTarget(null),
    confirmDeactivate,
    activate: (company: CompanyRow) => void changeActive(company, true),
    openReset: (company: CompanyRow) => {
      setResetDone(null);
      setShowPassword(false);
      setResetTarget(company);
    },
    closeReset: () => setResetTarget(null),
    togglePassword: () => setShowPassword((shown) => !shown),
    submitReset,
    retry,
    clearSearch,
  };
};
