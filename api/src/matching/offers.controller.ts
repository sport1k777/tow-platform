import {
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import type { AccessPayload } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ApprovedDriverGuard } from './approved-driver.guard';
import { OffersService } from './offers.service';

@Controller('driver/offers')
@UseGuards(JwtAuthGuard, RolesGuard, ApprovedDriverGuard)
@Roles('driver')
export class OffersController {
  constructor(@Inject(OffersService) private readonly offers: OffersService) {}

  @Get('current')
  current(@CurrentUser() user: AccessPayload) {
    return this.offers.current(user);
  }

  @Post(':id/accept')
  @HttpCode(200)
  accept(
    @CurrentUser() user: AccessPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.offers.accept(user, id);
  }

  @Post(':id/reject')
  @HttpCode(200)
  reject(
    @CurrentUser() user: AccessPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.offers.reject(user, id);
  }
}
