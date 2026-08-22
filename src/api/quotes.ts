import { apiRequest } from './client';
import type { GeoPlace } from './geo';
import type { ServiceKey, VehicleCategory } from '@/config/services';

export type QuoteLocation = GeoPlace;

export type QuoteBreakdownLine = {
  code: string;
  label: string;
  amountKopiyky: number;
};

export type QuoteResponse = {
  id: string;
  serviceKey: ServiceKey;
  vehicleCategory: VehicleCategory | null;
  pickup: QuoteLocation;
  destination: QuoteLocation | null;
  pickupLatitude?: number;
  pickupLongitude?: number;
  pickupAddress?: string;
  pickupSource?: string;
  distanceMeters: number;
  durationSeconds: number;
  amountKopiyky: number;
  currency: 'UAH' | string;
  expiresAt: string;
  breakdown?: {
    cityCode: string | null;
    lines: QuoteBreakdownLine[];
    totalKopiyky: number;
  };
};

export type CreateQuoteInput = {
  serviceKey: ServiceKey;
  pickup: QuoteLocation;
  destination?: QuoteLocation;
  vehicleCategory?: VehicleCategory;
  details?: Record<string, unknown>;
};

export function createQuote(input: CreateQuoteInput, accessToken: string) {
  return apiRequest<QuoteResponse>('/quotes', {
    method: 'POST',
    accessToken,
    body: {
      serviceKey: input.serviceKey,
      pickup: input.pickup,
      ...(input.destination ? { destination: input.destination } : {}),
      ...(input.vehicleCategory ? { vehicleCategory: input.vehicleCategory } : {}),
      ...(input.details ? { details: input.details } : {}),
    },
  });
}
