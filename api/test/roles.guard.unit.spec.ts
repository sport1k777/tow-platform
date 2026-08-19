import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AccessPayload } from '../src/auth/auth.service';
import { RolesGuard } from '../src/auth/roles.guard';

function contextWithUser(user?: AccessPayload): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as ExecutionContext;
}

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  };
  const guard = new RolesGuard(reflector as unknown as Reflector);

  beforeEach(() => {
    reflector.getAllAndOverride.mockReset();
  });

  it('allows requests when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(contextWithUser({ sub: 'u1', roles: ['customer'] }))).toBe(
      true,
    );
  });

  it('allows a caller who has one of the required roles', () => {
    reflector.getAllAndOverride.mockReturnValue(['customer']);
    expect(guard.canActivate(contextWithUser({ sub: 'u1', roles: ['customer'] }))).toBe(
      true,
    );
  });

  it('forbids a caller who lacks the required role', () => {
    reflector.getAllAndOverride.mockReturnValue(['customer']);
    expect(() =>
      guard.canActivate(contextWithUser({ sub: 'u1', roles: ['driver'] })),
    ).toThrow(ForbiddenException);
  });

  it('rejects missing authentication', () => {
    reflector.getAllAndOverride.mockReturnValue(['customer']);
    expect(() => guard.canActivate(contextWithUser(undefined))).toThrow(
      UnauthorizedException,
    );
  });
});
