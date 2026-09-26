import type { ListParams } from '../common.types';

export interface CompanyAdmin {
  id: string;
  name: string;
  // At least one of the two is set: the admin signs in with whichever exists.
  phone: string | null;
  email: string | null;
}

export interface Company {
  id: string;
  name: string;
  gstNo: string | null;
  // Shown in front of order and bill numbers ("FN" → FN-0001); null = plain numbers.
  numberPrefix: string | null;
  createdAt: string;
  // false suspends the company: nobody from it can sign in, and live sessions end
  // on their next request.
  isActive: boolean;
  admin: CompanyAdmin;
}

export interface CreateCompanyPayload {
  name: string;
  gstNo: string | null;
  numberPrefix: string | null;
  admin: {
    name: string;
    phone: string | null;
    email: string | null;
    password: string;
  };
}

// POST /admin/companies returns the created company as `data`, like every other route.
export type CreateCompanyResponse = Company;

// `q` matches the name. Sort: createdAt (default -createdAt), name.
export type CompaniesQuery = ListParams;

export interface ResetAdminPasswordPayload {
  password: string;
}

export interface ResetAdminPasswordResponse {
  changed: true;
  // The admin whose password was set, for the confirmation message.
  admin: string;
}
