import { Pencil, Power, PowerOff } from 'lucide-react';

import type { ServiceType } from '@api/process-backend/service-types';
import { LetterTile } from '@components/ui/avatar';
import { Badge } from '@components/ui/badge';
import { Card } from '@components/ui/card';
import { Menu, MenuItem } from '@components/ui/menu';
import { Skeleton } from '@components/ui/skeleton';
import { formatMoney } from '@utils/format/money';

export const SERVICE_TYPE_SKELETON_ROWS = 6;

// What the vendor pays, next to what it costs to do — the margin is the reason this screen exists.
export const PriceLine = ({ serviceType }: { serviceType: ServiceType }) => (
  <>
    <span className="font-medium">{formatMoney(serviceType.basePrice)}</span>
    <span className="text-fg-subtle"> / {serviceType.unit}</span>
  </>
);

export const BillOnBadge = ({ billOn }: { billOn: ServiceType['billOn'] }) => (
  <Badge tone={billOn === 'in' ? 'info' : 'violet'}>
    {billOn === 'in' ? 'Billed on received' : 'Billed on returned'}
  </Badge>
);

export interface ServiceTypeActionHandlers {
  onEdit: (serviceType: ServiceType) => void;
  onSetActive: (serviceType: ServiceType, isActive: boolean) => void;
}

export const ServiceTypeActions = ({
  serviceType,
  onEdit,
  onSetActive,
}: { serviceType: ServiceType } & ServiceTypeActionHandlers) => (
  <Menu label={`Actions for ${serviceType.name}`} className="flex-none">
    {(close) => (
      <>
        <MenuItem
          onClick={() => {
            close();
            onEdit(serviceType);
          }}
        >
          <Pencil aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
          Edit
        </MenuItem>
        {serviceType.isActive === false ? (
          <MenuItem
            onClick={() => {
              close();
              onSetActive(serviceType, true);
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
              onSetActive(serviceType, false);
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

export const ServiceTypeCard = ({
  serviceType,
  ...actions
}: { serviceType: ServiceType } & ServiceTypeActionHandlers) => (
  <li>
    <Card className="p-3.5">
      <div className="flex items-start gap-2.75">
        <LetterTile name={serviceType.name} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-sm font-semibold">{serviceType.name}</span>
            {!serviceType.isActive && <Badge tone="neutral">Inactive</Badge>}
          </p>
          <p className="mt-1 text-[12.5px]">
            <PriceLine serviceType={serviceType} />
          </p>
          <p className="mt-1 text-[11.5px] text-fg-subtle">
            Costs {formatMoney(serviceType.baseCost)} to run
          </p>
          <p className="mt-1.5">
            <BillOnBadge billOn={serviceType.billOn} />
          </p>
        </div>
        <ServiceTypeActions serviceType={serviceType} {...actions} />
      </div>
    </Card>
  </li>
);

export const ServiceTypeCardSkeleton = ({ delay = 0 }: { delay?: number }) => {
  const style = { animationDelay: `${delay}s` };
  return (
    <li>
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
    </li>
  );
};
