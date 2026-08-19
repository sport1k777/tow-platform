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
import { isInUkraine } from '../geo/ukraine-bounds';
import { calculateAmountKopiyky } from '../pricing/pricing.engine';
import { PricingService } from '../pricing/pricing.service';
import type { CreateQuoteDto } from './dto';

const FORBIDDEN_DETAIL_KEYS = new Set([
  'amount',
  'amountkopiyky',
  'currency',
  'distance',
  'distancemeters',
  'duration',
  'durationseconds',
  'price',
  'pricingruleid',
]);

export type QuoteResponse = {
  id: string;
  serviceKey: string;
  vehicleCategory: string | null;
  pickup: { lat: number; lng: number; label: string };
  destination: { lat: number; lng: number; label: string } | null;
  distanceMeters: number;
  durationSeconds: number;
  amountKopiyky: number;
  currency: string;
  expiresAt: string;
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

    const rule = await this.pricing.getActiveRule(
      body.serviceKey,
      body.vehicleCategory,
    );
    const amountKopiyky = calculateAmountKopiyky(distanceMeters, rule);
    const env = loadEnv();
    const expiresAt = new Date(Date.now() + env.QUOTE_TTL_SECONDS * 1000);

    const [quote] = await this.db
      .insert(quotes)
      .values({
        customerId: user.sub,
        serviceKey: body.serviceKey,
        vehicleCategory: body.vehicleCategory,
        details: body.details ?? {},
        pickupLabel: body.pickup.label,
        pickupLocation: geographyFromLngLat(body.pickup.lng, body.pickup.lat),
        destinationLabel: body.destination?.label,
        destinationLocation: body.destination
          ? geographyFromLngLat(body.destination.lng, body.destination.lat)
          : null,
        distanceMeters,
        durationSeconds,
        pricingRuleId: rule.id,
        amountKopiyky,
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
      pickup: body.pickup,
      destination: body.destination ?? null,
      distanceMeters: quote.distanceMeters,
      durationSeconds: quote.durationSeconds,
      amountKopiyky: quote.amountKopiyky,
      currency: quote.currency,
      expiresAt: quote.expiresAt.toISOString(),
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
