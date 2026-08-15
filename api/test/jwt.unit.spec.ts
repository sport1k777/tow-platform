import { signHs256Jwt, verifyHs256Jwt } from '../src/auth/jwt';

const secret = 'change-me-in-development-min-32-chars';

describe('HS256 JWT', () => {
  it('signs and verifies an access token', () => {
    const token = signHs256Jwt(
      { sub: 'user-1', roles: ['customer'] },
      secret,
      900,
    );

    expect(verifyHs256Jwt(token, secret)).toMatchObject({
      sub: 'user-1',
      roles: ['customer'],
    });
  });

  it('rejects a token signed with a different secret', () => {
    const token = signHs256Jwt(
      { sub: 'user-1', roles: ['customer'] },
      secret,
      900,
    );

    expect(() => verifyHs256Jwt(token, 'a-different-secret-that-is-long-enough')).toThrow(
      /Invalid token/,
    );
  });

  it('rejects an expired token', () => {
    const token = signHs256Jwt(
      { sub: 'user-1', roles: ['customer'] },
      secret,
      -1,
    );

    expect(() => verifyHs256Jwt(token, secret)).toThrow(/Expired token/);
  });
});
