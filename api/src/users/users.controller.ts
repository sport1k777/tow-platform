import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Inject,
  NotFoundException,
  Patch,
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
import { loadEnv } from '../config/env';
import { UpdateProfileDto } from './dto';
import { UsersService } from './users.service';

function avatarUploadInterceptor() {
  const env = loadEnv();
  return FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: env.MAX_AVATAR_BYTES, files: 1 },
  });
}

@Controller('users')
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AccessPayload) {
    const record = await this.users.findById(user.sub);
    if (!record) {
      return {
        id: user.sub,
        phone: null,
        displayName: null,
        firstName: null,
        lastName: null,
        hasAvatar: false,
        roles: user.roles,
      };
    }
    const roles = await this.users.getRoles(user.sub);
    return this.users.toPublic(record, roles);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(@CurrentUser() user: AccessPayload, @Body() body: UpdateProfileDto) {
    const record = await this.users.updateProfile(user.sub, {
      displayName: body.displayName,
      firstName: body.firstName,
      lastName: body.lastName,
    });
    const roles = await this.users.getRoles(user.sub);
    return this.users.toPublic(record, roles);
  }

  @Post('me/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(avatarUploadInterceptor())
  async uploadAvatar(
    @CurrentUser() user: AccessPayload,
    @UploadedFile() file: { buffer?: Buffer } | undefined,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('File is required');
    }
    const record = await this.users.setAvatar(user.sub, file.buffer);
    const roles = await this.users.getRoles(user.sub);
    return this.users.toPublic(record, roles);
  }

  @Delete('me/avatar')
  @UseGuards(JwtAuthGuard)
  async deleteAvatar(@CurrentUser() user: AccessPayload) {
    const record = await this.users.deleteAvatar(user.sub);
    const roles = await this.users.getRoles(user.sub);
    return this.users.toPublic(record, roles);
  }

  @Get('me/avatar')
  @UseGuards(JwtAuthGuard)
  @Header('Cache-Control', 'private, max-age=60')
  async avatar(
    @CurrentUser() user: AccessPayload,
    @Res({ passthrough: true }) response: Response,
  ) {
    const record = await this.users.findById(user.sub);
    if (!record) {
      throw new NotFoundException('User not found');
    }
    const file = this.users.avatarFile(record);
    response.setHeader('Content-Type', file.mimeType);
    return new StreamableFile(file.stream);
  }
}
