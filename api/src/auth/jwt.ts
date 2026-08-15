import { createHmac, timingSafeEqual } from 'node:crypto';

export type JwtPayload = {
  sub: string;
  roles: Array<'customer' | 'driver' | 'admin'>;
  iat: number;
  exp: number;
};

function base64url(value: Buffer | string): string {
  const buffer = typeof value === 'string' ? Buffer.from(value) : value;
  return buffer.toString('base64url');
}

function decodeBase64urlJson(value: string): unknown {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

export function signHs256Jwt(
  claims: Pick<JwtPayload, 'sub' | 'roles'>,
  secret: string,
  ttlSeconds: number,
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      ...claims,
      iat: now,
      exp: now + ttlSeconds,
    } satisfies JwtPayload),
  );
  const data = `${header}.${payload}`;
  const signature = createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifyHs256Jwt(token: string, secret: string): JwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token');
  }

  const [headerPart, payloadPart, signaturePart] = parts;
  const header = decodeBase64urlJson(headerPart);
  if (
    typeof header !== 'object' ||
    header === null ||
    !('alg' in header) ||
    header.alg !== 'HS256'
  ) {
    throw new Error('Invalid token');
  }

  const data = `${headerPart}.${payloadPart}`;
  const expected = createHmac('sha256', secret).update(data).digest();
  const actual = Buffer.from(signaturePart, 'base64url');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error('Invalid token');
  }

  const payload = decodeBase64urlJson(payloadPart);
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('sub' in payload) ||
    !('roles' in payload) ||
    !('exp' in payload) ||
    typeof payload.sub !== 'string' ||
    !Array.isArray(payload.roles) ||
    typeof payload.exp !== 'number'
  ) {
    throw new Error('Invalid token');
  }

  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new Error('Expired token');
  }

  return payload as JwtPayload;
}
