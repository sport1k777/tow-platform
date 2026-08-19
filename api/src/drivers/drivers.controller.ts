import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';

import type { AccessPayload } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ApprovedDriverGuard } from '../matching/approved-driver.guard';
import { PresenceDto } from './dto';
import { DriversService } from './drivers.service';

@Controller('drivers')
export class DriversController {
  constructor(@Inject(DriversService) private readonly drivers: DriversService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('driver')
  me(@CurrentUser() user: AccessPayload) {
    return this.drivers.getMe(user);
  }

  @Post('me/presence')
  @UseGuards(JwtAuthGuard, RolesGuard, ApprovedDriverGuard)
  @Roles('driver')
  presence(@CurrentUser() user: AccessPayload, @Body() body: PresenceDto) {
    return this.drivers.setPresence(user, body);
  }
}
