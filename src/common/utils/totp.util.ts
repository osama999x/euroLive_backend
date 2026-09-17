import { generateSecret, generateURI, verifySync } from 'otplib';

export function generateTotpSecret(): string {
  return generateSecret();
}

export function totpKeyUri(account: string, secret: string, issuer = 'King Live'): string {
  return generateURI({
    issuer,
    label: account,
    secret,
  });
}

export function verifyTotp(token: string, secret: string): boolean {
  return verifySync({ token, secret, epochTolerance: 30 }).valid === true;
}
