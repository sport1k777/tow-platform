import {
  BadRequestException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import type { AccessPayload } from '../auth/auth.service';
import { loadEnv } from '../config/env';
import { market } from '../config/market';
import { DATABASE } from '../db/database.tokens';
import type { Database } from '../db/database.module';
import { geographyFromLngLat, quotes, serviceTypes } from '../db/schema';
import { GeoService } from '../geo/geo.service';
import { parsePickupSource } from '../geo/pickup-source';
import { isInUkraine } from '../geo/ukraine-bounds';
import { PricingService } from '../pricing/pricing.service';
import type { PricingServiceKey } from '../pricing/types';
import type { CreateQuoteDto } from './dto';

const FORBIDDEN_DETAIL_KEYS = new Set([
  'amount',
  'amountkopiyky',
  'breakdown',
  'currency',
  'distance',
  'distancemeters',
  'duration',
  'durationseconds',
  'lines',
  'price',
  'pricingruleid',
  'payment',
  'totalkopiyky',
]);

export type QuoteBreakdownLine = {
  code: string;
  label: string;
  amountKopiyky: number;
};

export type QuoteResponse = {
  id: string;
  serviceKey: string;
  vehicleCategory: string | null;
  pickup: { lat: number; lng: number; label: string; source: string };
  destination: { lat: number; lng: number; label: string } | null;
  pickupLatitude: number;
  pickupLongitude: number;
  pickupAddress: string;
  pickupSource: string;
  distanceMeters: number;
  durationSeconds: number;
  amountKopiyky: number;
  currency: string;
  expiresAt: string;
  breakdown: {
    cityCode: string | null;
    lines: QuoteBreakdownLine[];
    totalKopiyky: number;
  };
};

@Injectable()
export class QuotesService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(GeoService) private readonly geoService: GeoService,
    @Inject(PricingService) private readonly pricing: PricingService,
  ) {}

  async create(user: AccessPayload, body: CreateQuoteDto): Promise<QuoteResponse> {
    this.rejectPricedDetails(body.details);

    const [service] = await this.db
      .select()
      .from(serviceTypes)
      .where(and(eq(serviceTypes.key, body.serviceKey), eq(serviceTypes.active, true)))
      .limit(1);
    if (!service) {
      throw new BadRequestException('Unknown service type');
    }

    if (service.destinationPolicy === 'required' && !body.destination) {
      throw new BadRequestException('Destination is required for this service');
    }

    if (!isInUkraine(body.pickup)) {
      throw new BadRequestException('Only locations in Ukraine are allowed');
    }

    let distanceMeters = 0;
    let durationSeconds = 0;
    if (body.destination) {
      const route = await this.geoService.route(body.pickup, body.destination);
      distanceMeters = route.distanceMeters;
      durationSeconds = route.durationSeconds;
    }

    const priced = await this.pricing.quote({
      serviceKey: body.serviceKey as PricingServiceKey,
      pickupLabel: body.pickup.label,
      pickup: { lat: body.pickup.lat, lng: body.pickup.lng },
      destinationLabel: body.destination?.label,
      destination: body.destination
        ? { lat: body.destination.lat, lng: body.destination.lng }
        : null,
      distanceMeters,
      vehicleCategory: body.vehicleCategory,
      details: body.details,
    });

    const env = loadEnv();
    const expiresAt = new Date(Date.now() + env.QUOTE_TTL_SECONDS * 1000);
    const pickupSource = parsePickupSource(body.pickup.source);
    const breakdown = {
      cityCode: priced.breakdown.cityCode,
      lines: priced.breakdown.lines,
      totalKopiyky: priced.breakdown.totalKopiyky,
    };

    const [quote] = await this.db
      .insert(quotes)
      .values({
        customerId: user.sub,
        serviceKey: body.serviceKey,
        vehicleCategory: body.vehicleCategory,
        details: {
          ...(body.details ?? {}),
          pickupLatitude: body.pickup.lat,
          pickupLongitude: body.pickup.lng,
          pickupAddress: body.pickup.label,
          pickupSource,
          breakdown,
        },
        pickupLabel: body.pickup.label,
        pickupLocation: geographyFromLngLat(body.pickup.lng, body.pickup.lat),
        pickupSource,
        destinationLabel: body.destination?.label,
        destinationLocation: body.destination
          ? geographyFromLngLat(body.destination.lng, body.destination.lat)
          : null,
        distanceMeters,
        durationSeconds,
        pricingRuleId: priced.tariff.id ?? null,
        amountKopiyky: priced.breakdown.totalKopiyky,
        currency: market.currency,
        expiresAt,
      })
      .returning({
        id: quotes.id,
        serviceKey: quotes.serviceKey,
        vehicleCategory: quotes.vehicleCategory,
        amountKopiyky: quotes.amountKopiyky,
        currency: quotes.currency,
        distanceMeters: quotes.distanceMeters,
        durationSeconds: quotes.durationSeconds,
        expiresAt: quotes.expiresAt,
      });

    return {
      id: quote.id,
      serviceKey: quote.serviceKey,
      vehicleCategory: quote.vehicleCategory,
      pickup: {
        lat: body.pickup.lat,
        lng: body.pickup.lng,
        label: body.pickup.label,
        source: pickupSource,
      },
      destination: body.destination ?? null,
      pickupLatitude: body.pickup.lat,
      pickupLongitude: body.pickup.lng,
      pickupAddress: body.pickup.label,
      pickupSource,
      distanceMeters: quote.distanceMeters,
      durationSeconds: quote.durationSeconds,
      amountKopiyky: quote.amountKopiyky,
      currency: quote.currency,
      expiresAt: quote.expiresAt.toISOString(),
      breakdown,
    };
  }

  private rejectPricedDetails(details?: Record<string, unknown>): void {
    if (!details) {
      return;
    }
    if (Array.isArray(details)) {
      throw new BadRequestException('details must be an object');
    }
    const forbidden = Object.keys(details).find((key) =>
      FORBIDDEN_DETAIL_KEYS.has(key.toLowerCase()),
    );
    if (forbidden) {
      throw new BadRequestException('details cannot include price or route fields');
    }
  }
}
