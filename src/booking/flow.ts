import type { Href } from 'expo-router';

import type { ServiceKey } from '@/config/services';
import { copy } from '@/copy/uk';

import type { BookingServiceType } from './serviceType';
import { bookingTypeForService } from './serviceType';

export function destinationRequiredFor(type: BookingServiceType): boolean {
  return type !== 'ROAD_ASSISTANCE';
}

export function firstBookingHref(service: ServiceKey): Href {
  const type = bookingTypeForService(service);
  if (type === 'TRANSPORT') {
    return { pathname: '/customer/intake', params: { service } };
  }
  return { pathname: '/customer/map', params: { service } };
}

export function detailsCopy(type: BookingServiceType): { title: string; subtitle: string } {
  switch (type) {
    case 'EVACUATOR':
      return { title: copy.detailsTitle, subtitle: copy.detailsSubtitle };
    case 'TRANSPORT':
      return { title: copy.transportDetailsTitle, subtitle: copy.transportDetailsSubtitle };
    case 'MOVING':
      return { title: copy.movingDetailsTitle, subtitle: copy.movingDetailsSubtitle };
    case 'ROAD_ASSISTANCE':
      return { title: copy.roadsideDetailsTitle, subtitle: copy.roadsideDetailsSubtitle };
  }
}
