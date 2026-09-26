import {
  Building,
  ClipboardList,
  House,
  Landmark,
  type LucideIcon,
  NotebookPen,
  Plus,
  ReceiptText,
  Settings,
  Store,
  WalletMinimal,
  Wrench,
} from 'lucide-react';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  // Bottom bar on phones: 'tab' gets its own tab, 'action' the raised centre button,
  // anything else moves into the "More" sheet.
  mobile?: 'tab' | 'action';
  mobileLabel?: string;
  // Exact match only; needed when another menu path starts with this one.
  end?: boolean;
  badge?: number;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export interface WorkspaceIdentity {
  name: string;
  role: string;
  // The signed-in role's accent token name ("brand", "warning"): what makes one
  // workspace look different from another at a glance.
  accent: string;
  user: { name: string; email: string };
}

export const COMPANY_ADMIN_NAV: NavGroup[] = [
  {
    title: 'Operations',
    items: [
      { label: 'Dashboard', to: '/', icon: House, mobile: 'tab', mobileLabel: 'Home', end: true },
      { label: 'Orders', to: '/orders', icon: ClipboardList, mobile: 'tab', end: true },
      { label: 'New order', to: '/orders/new', icon: Plus, mobile: 'action', mobileLabel: 'New' },
      { label: 'Bills', to: '/bills', icon: ReceiptText, mobile: 'tab' },
      { label: 'Vendors', to: '/vendors', icon: Store },
      { label: 'Service types', to: '/service-types', icon: Wrench },
      { label: 'Bank', to: '/bank', icon: Landmark },
      { label: 'Expenses', to: '/expenses', icon: WalletMinimal },
      { label: 'Daily log', to: '/daily-log', icon: NotebookPen },
      { label: 'Settings', to: '/settings', icon: Settings },
    ],
  },
];

export const SUPER_ADMIN_NAV: NavGroup[] = [
  {
    title: 'Platform',
    items: [{ label: 'Companies', to: '/admin/companies', icon: Building, mobile: 'tab' }],
  },
];
