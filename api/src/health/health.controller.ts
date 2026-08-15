import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';

import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(HealthService) private readonly healthService: HealthService,
  ) {}

  @Get()
  health() {
    return this.healthService.check();
  }

  @Get('ready')
  async ready() {
    const ready = await this.healthService.isReady();
    if (!ready) {
      throw new ServiceUnavailableException({ ready: false });
    }
    return { ready: true };
  }
}
