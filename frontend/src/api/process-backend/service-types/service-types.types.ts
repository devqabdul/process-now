import type { ListParams } from '../common.types';

// Whether the bill counts the quantity received or the quantity returned.
export type BillOn = 'in' | 'out';

export interface OptionChoice {
  name: string;
  // Added to the unit price / cost when chosen.
  price: number;
  cost: number;
}

export interface OptionGroup {
  group: string;
  // true: any number of choices; false: at most one.
  multi: boolean;
  choices: OptionChoice[];
}

export interface ServiceType {
  id: string;
  name: string;
  isActive: boolean;
  // Label shown in the UI and on bills: 'piece', 'kg', …
  unit: string;
  basePrice: string;
  baseCost: string;
  billOn: BillOn;
  options: OptionGroup[];
  createdAt: string;
}

export interface CreateServiceTypePayload {
  name: string;
  unit: string;
  basePrice: number;
  baseCost: number;
  billOn: BillOn;
  options?: OptionGroup[];
}

// `isActive: false` hides it from new orders; old orders keep referencing it.
export type UpdateServiceTypePayload = Partial<CreateServiceTypePayload> & {
  isActive?: boolean;
};

// `q` matches the name. Sort: name (default), basePrice, createdAt.
export type ServiceTypesQuery = ListParams;
