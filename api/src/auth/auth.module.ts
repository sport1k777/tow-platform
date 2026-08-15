import { Module } from '@nestjs/common';

import { createSmsProvider } from '../sms/create-sms-provider';
import { SMS_PROVIDER } from '../sms/sms.provider';
import { UsersService } from '../users/users.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    UsersService,
    JwtAuthGuard,
    {
      provide: SMS_PROVIDER,
      useFactory: createSmsProvider,
    },
  ],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
