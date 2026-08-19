import { SetMetadata } from '@nestjs/common';

import type { AccessPayload } from './auth.service';

export const ROLES_KEY = 'roles';

export type UserRole = AccessPayload['roles'][number];

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
