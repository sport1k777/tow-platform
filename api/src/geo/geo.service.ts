import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { GEO_PROVIDER, type GeoProvider } from './geo.provider';
import { isInUkraine, type LatLng } from './ukraine-bounds';

@Injectable()
export class GeoService {
  constructor(@Inject(GEO_PROVIDER) private readonly geo: GeoProvider) {}

  async geocode(query: string) {
    const items = await this.geo.geocode(query.trim());
    return { items: items.filter((item) => isInUkraine(item)) };
  }

  async reverse(point: LatLng) {
    this.requireUkraine(point);
    const place = await this.geo.reverse(point);
    if (!place || !isInUkraine(place)) {
      throw new NotFoundException('Address not found in Ukraine');
    }
    return place;
  }

  async route(origin: LatLng, destination: LatLng) {
    this.requireUkraine(origin);
    this.requireUkraine(destination);
    try {
      return await this.geo.route(origin, destination);
    } catch {
      throw new NotFoundException('No route found');
    }
  }

  private requireUkraine(point: LatLng): void {
    if (!isInUkraine(point)) {
      throw new BadRequestException('Only locations in Ukraine are allowed');
    }
  }
}
