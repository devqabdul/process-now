import { KeyRound, Power, PowerOff } from 'lucide-react';

import type { Company } from '@api/process-backend/companies';
import { LetterTile } from '@components/ui/avatar';
import { Badge } from '@components/ui/badge';
import { Card } from '@components/ui/card';
import { Menu, MenuItem } from '@components/ui/menu';
import { Skeleton } from '@components/ui/skeleton';
import { displayIdentifier } from '@utils/identifier';

// The list fetches every company in one go, so the skeleton shows the number that arrives.
export const COMPANY_SKELETON_ROWS = 5;

// A company plus its display-ready created date, built by the page's controller hook.
export interface CompanyRow extends Company {
  createdOn: string;
}

export const AdminContact = ({ admin }: { admin: Company['admin'] }) => (
  <>
    {admin.phone && <span className="whitespace-nowrap">{displayIdentifier(admin.phone)}</span>}
    {admin.phone && admin.email && <span aria-hidden="true"> · </span>}
    {admin.email && <span className="break-all">{admin.email}</span>}
  </>
);

// Only an explicit false suspends a company: a flag that never arrived must not brand
// every row on the platform as inactive.
export const StatusBadge = ({ isActive }: { isActive: boolean }) =>
  isActive === false ? <Badge tone="danger">Inactive</Badge> : null;

export const GstMarker = ({ gstNo }: { gstNo: string | null }) =>
  gstNo ? (
    <span className="font-mono text-11 text-fg-subtle">{gstNo}</span>
  ) : (
    <Badge tone="neutral">No GST</Badge>
  );

export interface CompanyActionHandlers {
  onResetPassword: (company: CompanyRow) => void;
  onDeactivate: (company: CompanyRow) => void;
  onActivate: (company: CompanyRow) => void;
}

export const CompanyActions = ({
  company,
  onResetPassword,
  onDeactivate,
  onActivate,
}: { company: CompanyRow } & CompanyActionHandlers) => (
  <Menu label={`Actions for ${company.name}`} className="flex-none">
    {(close) => (
      <>
        <MenuItem
          onClick={() => {
            close();
            onResetPassword(company);
          }}
        >
          <KeyRound aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
          Change password
        </MenuItem>
        {company.isActive === false ? (
          <MenuItem
            onClick={() => {
              close();
              onActivate(company);
            }}
          >
            <Power aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
            Activate
          </MenuItem>
        ) : (
          <MenuItem
            tone="danger"
            onClick={() => {
              close();
              onDeactivate(company);
            }}
          >
            <PowerOff aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
            Deactivate
          </MenuItem>
        )}
      </>
    )}
  </Menu>
);

export const CompanyCard = ({
  company,
  ...actions
}: { company: CompanyRow } & CompanyActionHandlers) => (
  <Card className="p-3.5">
    <div className="flex items-start gap-2.75">
      <LetterTile name={company.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{company.name}</p>
        <p className="mt-1.25 flex flex-wrap items-center gap-1.5">
          <GstMarker gstNo={company.gstNo} />
          <StatusBadge isActive={company.isActive} />
        </p>
      </div>
      <span className="flex-none text-11 whitespace-nowrap text-fg-subtle tabular-nums">
        {company.createdOn}
      </span>
      <CompanyActions company={company} {...actions} />
    </div>

    <div className="mt-3 border-t border-line-subtle pt-2.75">
      <p className="text-13 font-medium">{company.admin.name}</p>
      <p className="mt-0.5 text-xs text-fg-subtle">
        <AdminContact admin={company.admin} />
      </p>
    </div>
  </Card>
);

export const CompanyCardSkeleton = ({ delay = 0 }: { delay?: number }) => {
  const style = { animationDelay: `${delay}s` };
  return (
    <Card className="p-3.5">
      <div className="flex items-start gap-2.75">
        <Skeleton className="size-7 flex-none rounded-9" style={style} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            <Skeleton className="inline-block h-2.75 w-2/5" style={style} />
          </p>
          <p className="mt-1.25">
            <Skeleton className="inline-block h-2.25 w-3/5" style={style} />
          </p>
        </div>
      </div>
      <div className="mt-3 border-t border-line-subtle pt-2.75">
        <p className="text-13">
          <Skeleton className="inline-block w-1/3" style={style} />
        </p>
        <p className="mt-0.5 text-xs">
          <Skeleton className="inline-block w-3/5" style={style} />
        </p>
      </div>
    </Card>
  );
};
