import {
  Body,
  Controller,
  Get,
  Header,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import type { AccessPayload } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UsersService } from '../users/users.service';
import { RejectReasonDto } from '../verification/dto';
import { DocumentsService } from '../verification/documents.service';
import { AdminService } from './admin.service';
import { AdminDriverStatusDto, AdminOrderStatusDto, AdminPricingDto } from './dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(
    @Inject(AdminService) private readonly admin: AdminService,
    @Inject(DocumentsService) private readonly documents: DocumentsService,
    @Inject(UsersService) private readonly users: UsersService,
  ) {}

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
  usersList() {
    return this.admin.listUsers();
  }

  @Get('drivers')
  drivers() {
    return this.admin.listDrivers();
  }

  @Get('drivers/:id/verification')
  driverVerification(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.documents.getAdminDriverVerification(id);
  }

  @Get('drivers/:id/avatar')
  @Header('Cache-Control', 'private, max-age=60')
  async driverAvatar(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const record = await this.users.findById(id);
    if (!record) {
      throw new NotFoundException('Driver not found');
    }
    const file = this.users.avatarFile(record);
    response.setHeader('Content-Type', file.mimeType);
    return new StreamableFile(file.stream);
  }

  @Get('drivers/:id/documents/:documentId/file')
  @Header('Cache-Control', 'private, no-store')
  async driverDocumentFile(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.documents.openDocumentFile(id, documentId, true);
    response.setHeader('Content-Type', file.mimeType);
    return new StreamableFile(file.stream);
  }

  @Post('drivers/:id/status')
  driverStatus(
    @CurrentUser() user: AccessPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: AdminDriverStatusDto,
  ) {
    return this.admin.setDriverStatus(user.sub, id, body);
  }

  @Post('documents/:id/approve')
  approveDocument(
    @CurrentUser() user: AccessPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.documents.approveDocument(user.sub, id);
  }

  @Post('documents/:id/reject')
  rejectDocument(
    @CurrentUser() user: AccessPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: RejectReasonDto,
  ) {
    return this.documents.rejectDocument(user.sub, id, body.reason);
  }

  @Post('documents/:id/reupload')
  requestReupload(
    @CurrentUser() user: AccessPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: RejectReasonDto,
  ) {
    return this.documents.requestReupload(user.sub, id, body.reason);
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
