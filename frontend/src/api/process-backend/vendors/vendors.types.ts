import type { PageQuery } from '../common.types';

export interface Vendor {
  id: string;
  name: string;
  // 10 digits, no +91.
  phone: string;
  address: string | null;
  // false retires the vendor: hidden from new orders, their history untouched.
  isActive: boolean;
  createdAt: string;
}

export interface VendorsQuery extends PageQuery {
  // Matches name or phone.
  q?: string;
}

export interface CreateVendorPayload {
  name: string;
  phone: string;
  address?: string;
}

export type UpdateVendorPayload = Partial<CreateVendorPayload> & { isActive?: boolean };
