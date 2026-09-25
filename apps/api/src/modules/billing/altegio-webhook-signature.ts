import { createHmac, timingSafeEqual } from 'node:crypto';

const SIGNATURE_LENGTH = 64;

/**
 * FastSign-style marketplace signature: `user_data_sign` is the lowercase hex
 * HMAC-SHA256 of the exact `user_data` string, keyed with
 * `ALTEGIO_MARKETPLACE_PARTNER_KEY`.
 */
export function computeUserDataSign(userData: string, secretKey: string): string {
  return createHmac('sha256', secretKey).update(userData, 'utf8').digest('hex');
}

export function isUserDataSignValid(
  userData: string,
  sign: string,
  secretKey: string,
): boolean {
  const normalizedSign = sign.trim().toLowerCase();
  if (!userData || normalizedSign.length !== SIGNATURE_LENGTH || !secretKey) {
    return false;
  }

  const expected = Buffer.from(computeUserDataSign(userData, secretKey), 'utf8');
  const actual = Buffer.from(normalizedSign, 'utf8');

  return timingSafeEqual(expected, actual);
}