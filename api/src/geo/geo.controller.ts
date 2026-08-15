import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GeocodeDto, ReverseDto, RouteDto } from './dto';
import { GeoService } from './geo.service';

@Controller('geo')
@UseGuards(JwtAuthGuard)
export class GeoController {
  constructor(@Inject(GeoService) private readonly geoService: GeoService) {}

  @Post('geocode')
  geocode(@Body() body: GeocodeDto) {
    return this.geoService.geocode(body.query);
  }

  @Post('reverse')
  reverse(@Body() body: ReverseDto) {
    return this.geoService.reverse({ lat: body.lat, lng: body.lng });
  }

  @Post('route')
  route(@Body() body: RouteDto) {
    return this.geoService.route(body.origin, body.destination);
  }
}
