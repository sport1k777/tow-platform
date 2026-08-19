import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import type { AccessPayload } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminService } from './admin.service';
import { AdminDriverStatusDto, AdminOrderStatusDto, AdminPricingDto } from './dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(@Inject(AdminService) private readonly admin: AdminService) {}

  @Get('stats')
  stats() {
    return this.admin.stats();
  }

  @Get('orders/export')
  exportOrders() {
    return this.admin.exportOrdersCsv().then((csv) => ({ csv }));
  }

  @Get('orders')
  orders(@Query('status') status?: string) {
    return this.admin.listOrders(status);
  }

  @Get('orders/:id')
  order(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.admin.getOrder(id);
  }

  @Post('orders/:id/status')
  orderStatus(
    @CurrentUser() user: AccessPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: AdminOrderStatusDto,
  ) {
    return this.admin.setOrderStatus(id, user.sub, body);
  }

  @Get('users')
  users() {
    return this.admin.listUsers();
  }

  @Get('drivers')
  drivers() {
    return this.admin.listDrivers();
  }

  @Post('drivers/:id/status')
  driverStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: AdminDriverStatusDto,
  ) {
    return this.admin.setDriverStatus(id, body);
  }

  @Get('pricing')
  pricing() {
    return this.admin.listPricing();
  }

  @Post('pricing')
  savePricing(@Body() body: AdminPricingDto) {
    return this.admin.upsertPricing(body);
  }
}
