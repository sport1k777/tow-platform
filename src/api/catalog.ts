import type { DestinationPolicy, ServiceKey } from '@/config/services';

import { apiRequest } from './client';

export type ServiceTypeItem = {
  key: ServiceKey;
  destinationPolicy: DestinationPolicy;
};

export function fetchServiceTypes(accessToken: string) {
  return apiRequest<{ items: ServiceTypeItem[] }>('/service-types', { accessToken });
}
