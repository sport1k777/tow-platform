import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ApprovedDriverGuard } from '../matching/approved-driver.guard';
import { VerificationModule } from '../verification/verification.module';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';

@Module({
  imports: [AuthModule, VerificationModule],
  controllers: [DriversController],
  providers: [DriversService, ApprovedDriverGuard],
  exports: [DriversService],
})
export class DriversModule {}
