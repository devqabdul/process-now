/**
 * An item shows the service name, unit and billing basis snapshotted when it was taken in,
 * so editing a service type never rewrites an old order or bill.
 */
export const withSnapshotServiceType = <
  T extends {
    serviceName: string;
    unit: string;
    billOn: string;
    serviceType: object;
  },
>(
  item: T,
) => ({
  ...item,
  serviceType: {
    ...item.serviceType,
    name: item.serviceName,
    unit: item.unit,
    billOn: item.billOn,
  },
});
