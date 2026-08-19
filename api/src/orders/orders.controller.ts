import {
  Body,
  Controller,
  Get,
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
import { CreateOrderDto } from './dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(@Inject(OrdersService) private readonly orders: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer')
  create(@CurrentUser() user: AccessPayload, @Body() body: CreateOrderDto) {
    return this.orders.create(user, body);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('customer')
  list(@CurrentUser() user: AccessPayload) {
    return this.orders.listForCustomer(user);
  }

  @Get('driver/active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('driver')
  listDriver(@CurrentUser() user: AccessPayload) {
    return this.orders.listForDriver(user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  get(
    @CurrentUser() user: AccessPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.orders.getById(user, id);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  cancel(
    @CurrentUser() user: AccessPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.orders.cancel(user, id);
  }

  @Post(':id/complete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('driver')
  complete(
    @CurrentUser() user: AccessPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.orders.complete(user, id);
  }

  @Post(':id/en-route')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('driver')
  enRoute(
    @CurrentUser() user: AccessPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.orders.progress(user, id, 'driver_en_route');
  }

  @Post(':id/arrive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('driver')
  arrive(
    @CurrentUser() user: AccessPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.orders.progress(user, id, 'arrived');
  }

  @Post(':id/start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('driver')
  start(
    @CurrentUser() user: AccessPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.orders.progress(user, id, 'in_progress');
  }
}
