import { Pencil, Power, PowerOff } from 'lucide-react';
import { Link } from 'react-router';

import type { Vendor } from '@api/process-backend/vendors';
import { LetterTile } from '@components/ui/avatar';
import { Badge } from '@components/ui/badge';
import { Card } from '@components/ui/card';
import { Menu, MenuItem } from '@components/ui/menu';
import { Skeleton } from '@components/ui/skeleton';
import { displayIdentifier } from '@utils/identifier';

export const VENDOR_SKELETON_ROWS = 6;

export interface VendorActionHandlers {
  onEdit: (vendor: Vendor) => void;
  onSetActive: (vendor: Vendor, isActive: boolean) => void;
}

export const VendorActions = ({
  vendor,
  onEdit,
  onSetActive,
}: { vendor: Vendor } & VendorActionHandlers) => (
  <Menu label={`Actions for ${vendor.name}`} className="flex-none">
    {(close) => (
      <>
        <MenuItem
          onClick={() => {
            close();
            onEdit(vendor);
          }}
        >
          <Pencil aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
          Edit
        </MenuItem>
        {vendor.isActive === false ? (
          <MenuItem
            onClick={() => {
              close();
              onSetActive(vendor, true);
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
              onSetActive(vendor, false);
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

export const VendorCard = ({ vendor, ...actions }: { vendor: Vendor } & VendorActionHandlers) => (
  <Card className="p-3.5">
    <div className="flex items-start gap-2.75">
      <LetterTile name={vendor.name} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1.5">
          <Link
            to={`/vendors/${vendor.id}`}
            className="truncate text-sm font-semibold hover:text-link hover:underline"
          >
            {vendor.name}
          </Link>
          {vendor.isActive === false && <Badge tone="neutral">Inactive</Badge>}
        </p>
        <p className="mt-1 text-xs whitespace-nowrap text-fg-subtle">
          {displayIdentifier(vendor.phone)}
        </p>
        {vendor.address && <p className="mt-1 text-xs text-fg-subtle">{vendor.address}</p>}
      </div>
      <VendorActions vendor={vendor} {...actions} />
    </div>
  </Card>
);

export const VendorCardSkeleton = ({ delay = 0 }: { delay?: number }) => {
  const style = { animationDelay: `${delay}s` };
  return (
    <Card className="p-3.5">
      <div className="flex items-start gap-2.75">
        <Skeleton className="size-7 flex-none rounded-9" style={style} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            <Skeleton className="inline-block h-2.75 w-2/5" style={style} />
          </p>
          <p className="mt-1">
            <Skeleton className="inline-block h-2.25 w-1/3" style={style} />
          </p>
        </div>
      </div>
    </Card>
  );
};
