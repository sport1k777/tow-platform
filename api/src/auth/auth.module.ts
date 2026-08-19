import { Module } from '@nestjs/common';

import { createSmsProvider } from '../sms/create-sms-provider';
import { SMS_PROVIDER } from '../sms/sms.provider';
import { UsersController } from '../users/users.controller';
import { UsersService } from '../users/users.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

@Module({
  controllers: [AuthController, UsersController],
  providers: [
    AuthService,
    UsersService,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: SMS_PROVIDER,
      useFactory: createSmsProvider,
    },
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard, UsersService],
})
export class AuthModule {}
