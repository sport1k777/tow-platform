import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { memoryStorage } from 'multer';

import type { AccessPayload } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { loadEnv } from '../config/env';
import { UploadDocumentDto } from './dto';
import { DocumentsService } from './documents.service';

function documentUploadInterceptor() {
  const env = loadEnv();
  return FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: env.MAX_DOCUMENT_BYTES, files: 1 },
  });
}

@Controller()
export class DocumentsController {
  constructor(@Inject(DocumentsService) private readonly documents: DocumentsService) {}

  @Get('drivers/me/verification')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('driver')
  me(@CurrentUser() user: AccessPayload) {
    return this.documents.getDriverVerification(user.sub);
  }

  @Post('drivers/me/documents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('driver')
  @UseInterceptors(documentUploadInterceptor())
  upload(
    @CurrentUser() user: AccessPayload,
    @UploadedFile() file: { buffer?: Buffer } | undefined,
    @Body() body: UploadDocumentDto,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('File is required');
    }
    return this.documents.uploadDocument(user.sub, body.type, file.buffer);
  }

  @Post('drivers/me/documents/:id/replace')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('driver')
  @UseInterceptors(documentUploadInterceptor())
  replace(
    @CurrentUser() user: AccessPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @UploadedFile() file: { buffer?: Buffer } | undefined,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('File is required');
    }
    return this.documents.replaceDocument(user.sub, id, file.buffer);
  }

  @Get('drivers/me/documents/:id/file')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('driver')
  @Header('Cache-Control', 'private, no-store')
  async ownFile(
    @CurrentUser() user: AccessPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.documents.openDocumentFile(user.sub, id, false);
    response.setHeader('Content-Type', file.mimeType);
    return new StreamableFile(file.stream);
  }
}
