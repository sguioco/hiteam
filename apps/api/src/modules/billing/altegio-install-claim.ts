import { isUserDataSignValid } from './altegio-webhook-signature';

export type AltegioInstallClaimVerdict =
  | { claim: false; reason: 'not_present' }
  | { claim: true; error: 'partial' }
  | { claim: true; error: 'invalid_signature' }
  | { claim: true; error: 'salon_mismatch' }
  | { claim: true; valid: true };

/**
 * Verifies the FastSign-style install claim Altegio appends to the redirect
 * that opens the marketplace flow (`user_data` + `user_data_sign`, keyed with
 * `ALTEGIO_MARKETPLACE_PARTNER_KEY`). A valid claim proves the browser really
 * arrived from Altegio for that salon, so an arbitrary HiTeam account cannot
 * claim an unbound salon.
 *
 * Only call when a partner key is configured; without a key there is nothing
 * to verify. `claimedLocationId` is compared against any salon id encoded
 * inside `user_data` when it is extractable (keeps a rewritten redirect query
 * from binding a different salon than the one Altegio signed).
 */
export function verifyAltegioInstallClaim(args: {
  userData: string;
  userDataSign: string;
  claimedLocationId?: string;
  partnerKey: string;
}): AltegioInstallClaimVerdict {
  const userData = String(args.userData ?? '').trim();
  const userDataSign = String(args.userDataSign ?? '').trim();

  if (!userData && !userDataSign) {
    return { claim: false, reason: 'not_present' };
  }
  if (!userData || !userDataSign) {
    return { claim: true, error: 'partial' };
  }

  const validSignature = isUserDataSignValid(userData, userDataSign, args.partnerKey);
  if (!validSignature) {
    return { claim: true, error: 'invalid_signature' };
  }

  const saloned = extractSalonIdFromUserData(userData);
  const claimed = String(args.claimedLocationId ?? '').trim();
  if (saloned && claimed && saloned !== claimed) {
    return { claim: true, error: 'salon_mismatch' };
  }

  return { claim: true, valid: true };
}

export function extractSalonIdFromUserData(userData: string): string | null {
  const normalized = userData.trim();
  if (!normalized) {
    return null;
  }

  try {
    const parsed = JSON.parse(normalized);
    if (parsed && typeof parsed === 'object') {
      for (const key of ['salon_id', 'location_id', 'company_id', 'shared_user_id']) {
        const value = (parsed as Record<string, unknown>)[key];
        if (value != null && /^\d+$/.test(String(value))) {
          return String(value);
        }
      }
    }
  } catch {
    // user_data is not always JSON (FastSign also signs a plain login string).
  }

  const keyMatch = normalized.match(
    /(?:salon_id|location_id|company_id)["']?\s*[:=]\s*["']?(\d{1,20})/,
  );
  if (keyMatch?.[1]) {
    return keyMatch[1];
  }

  return null;
}