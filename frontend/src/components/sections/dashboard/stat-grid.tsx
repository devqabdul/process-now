import { IndianRupee, Layers, Package, Sparkles, Timer, TrendingUp, Zap } from 'lucide-react';

import type { Dashboard } from '@api/process-backend/dashboard';
import { StatTile, StatTileSkeleton } from '@components/shared/stat-tile';
import { formatMoney } from '@utils/format/money';
import { formatQuantity } from '@utils/format/quantity';

const GRID = 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4';
const NONE = '—';
const TILE_COUNT = 7;

interface StatGridProps {
  dashboard: Dashboard | undefined;
}

export const StatGrid = ({ dashboard }: StatGridProps) => {
  if (!dashboard)
    return (
      <div className={GRID}>
        {Array.from({ length: TILE_COUNT }, (_, index) => (
          <StatTileSkeleton key={index} />
        ))}
      </div>
    );

  const { dailyLog } = dashboard;
  const processed = dashboard.itemsProcessed
    .map((entry) => formatQuantity(entry.qty, entry.unit))
    .join(' · ');

  return (
    <div className={GRID}>
      <StatTile
        label="Pending orders"
        value={dashboard.pendingOrdersCount}
        icon={Package}
        iconClassName="bg-warning-solid"
        sub="Not returned yet"
      />
      <StatTile
        label="Amount to collect"
        value={formatMoney(dashboard.amountToCollect)}
        icon={IndianRupee}
        iconClassName="bg-danger"
        sub="Billed minus paid"
      />
      <StatTile
        label="Items processed"
        value={processed || NONE}
        icon={Layers}
        iconClassName="bg-info-solid"
        sub="Returned on this day"
      />
      <StatTile
        label="Machine hours"
        value={dailyLog ? formatQuantity(dailyLog.machineHours, 'hrs') : NONE}
        icon={Timer}
        iconClassName="bg-violet-solid"
        sub={dailyLog ? 'From the daily log' : 'No daily log yet'}
      />
      <StatTile
        label="Electricity"
        value={dailyLog ? formatQuantity(dailyLog.electricityUnits, 'units') : NONE}
        icon={Zap}
        iconClassName="bg-warning-solid"
        sub={dailyLog ? 'From the daily log' : 'No daily log yet'}
      />
      <StatTile
        label="Earnings"
        value={formatMoney(dashboard.earnings)}
        icon={TrendingUp}
        iconClassName="bg-success-solid"
        sub="Billed on this day"
      />
      <StatTile
        label="Estimated profit"
        value={formatMoney(dashboard.estimatedProfit)}
        icon={Sparkles}
        iconClassName="bg-success-solid"
        sub="Estimated from your configured costs"
      />
    </div>
  );
};
