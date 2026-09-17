import { createHash, randomInt } from 'crypto';

export function generatePublicId(): string {
  return String(10_000_000 + randomInt(0, 89_999_999));
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
