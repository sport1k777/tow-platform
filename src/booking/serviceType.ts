import type { ServiceKey } from '@/config/services';

export const bookingServiceTypes = [
  'EVACUATOR',
  'TRANSPORT',
  'MOVING',
  'ROAD_ASSISTANCE',
] as const;

export type BookingServiceType = (typeof bookingServiceTypes)[number];

export const serviceKeyByType: Record<BookingServiceType, ServiceKey> = {
  EVACUATOR: 'tow',
  TRANSPORT: 'cargo',
  MOVING: 'moving',
  ROAD_ASSISTANCE: 'roadside',
};

export const typeByServiceKey: Record<ServiceKey, BookingServiceType> = {
  tow: 'EVACUATOR',
  cargo: 'TRANSPORT',
  moving: 'MOVING',
  roadside: 'ROAD_ASSISTANCE',
};

export function bookingTypeForService(service: ServiceKey): BookingServiceType {
  return typeByServiceKey[service];
}
