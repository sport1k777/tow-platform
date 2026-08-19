import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';

import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import type { Database } from '../db/database.module';
import { DATABASE } from '../db/database.tokens';
import { driverProfiles } from '../db/schema';

@Injectable()
export class ApprovedDriverGuard implements CanActivate {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new UnauthorizedException();
    }

    const [profile] = await this.db
      .select({ verificationStatus: driverProfiles.verificationStatus })
      .from(driverProfiles)
      .where(eq(driverProfiles.userId, request.user.sub))
      .limit(1);

    if (!profile || profile.verificationStatus !== 'approved') {
      throw new ForbiddenException('Driver is not approved');
    }
    return true;
  }
}
