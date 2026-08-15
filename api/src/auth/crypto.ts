import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

export function hmacSha256(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}

export function hashesMatch(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function generateOtp(length: number): string {
  const max = 10 ** length;
  return String(randomInt(0, max)).padStart(length, '0');
}

export function generateRefreshToken(): string {
  return randomBytes(32).toString('hex');
}
