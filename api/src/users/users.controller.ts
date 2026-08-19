import { Body, Controller, Get, Inject, Patch, UseGuards } from '@nestjs/common';

import type { AccessPayload } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateProfileDto } from './dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AccessPayload) {
    const record = await this.users.findById(user.sub);
    const roles = await this.users.getRoles(user.sub);
    return {
      id: user.sub,
      phone: record?.phone ?? null,
      displayName: record?.displayName ?? null,
      roles,
    };
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(@CurrentUser() user: AccessPayload, @Body() body: UpdateProfileDto) {
    const record = await this.users.updateDisplayName(user.sub, body.displayName.trim());
    return {
      id: record.id,
      phone: record.phone,
      displayName: record.displayName,
    };
  }
}
