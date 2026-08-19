import { Controller, Get, Inject, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ServiceTypesService } from './service-types.service';

@Controller('service-types')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('customer')
export class ServiceTypesController {
  constructor(
    @Inject(ServiceTypesService) private readonly serviceTypes: ServiceTypesService,
  ) {}

  @Get()
  list() {
    return this.serviceTypes.listActive();
  }
}
