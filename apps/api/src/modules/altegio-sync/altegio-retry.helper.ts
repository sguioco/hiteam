/**
 * Shared retry/backoff policy for outbound Altegio HTTP calls (B2B and
 * marketplace clients).
 *
 * Altegio answers 429 when a partner/user bursts past its rate limits and 5xx
 * on transient failures. A webhook sync that simply throws on these drops the
 * event and forces HiTeam to rediscover it later, so both clients retry with
 * exponential backoff, honour the server's `Retry-After`, and jitter so a fleet
 * of workers does not hit Altegio in lockstep.
 *
 * This is a plain helper (no Nest DI) so it is trivially unit-testable.
 */

export const ALTEGIO_RETRYABLE_STATUS_SET = new Set([429, 500, 502, 503, 504]);

export type AltegioRetryableStatus = 429 | 500 | 502 | 503 | 504;

export function isAltegioRetryableStatus(status: number): status is AltegioRetryableStatus {
  return ALTEGIO_RETRYABLE_STATUS_SET.has(status);
}

export type AltegioRetryVerdict =
  | { kind: 'retry'; delayMs: number }
  | { kind: 'give_up' };

export type AltegioRetryPolicyArgs = {
  /** Zero-based attempt of the request that just failed (0 = first call). */
  attempt: number;
  /** Total attempts allowed (initial + retries), >= 1. */
  maxAttempts: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterMs?: number;
};

export function altegioRetryDelayMs(args: AltegioRetryPolicyArgs): number {
  const maxAttempts = Math.max(1, Math.floor(args.maxAttempts) || 1);
  if (args.attempt < 0 || args.attempt + 1 >= maxAttempts) {
    return -1;
  }

  const base = Math.max(50, Math.floor(args.baseDelayMs ?? 500));
  const cap = Math.max(base, Math.floor(args.maxDelayMs ?? 20_000));
  const jitterMax = Math.max(0, Math.floor(args.jitterMs ?? 150));

  const exponential = base * 2 ** args.attempt;
  const delayMs = Math.min(cap, exponential);
  const jitter = Math.floor(Math.random() * (jitterMax + 1));
  return delayMs + (Math.random() < 0.5 ? jitter : -jitter);
}

/** Delay in ms before the next attempt, or -1 when the retry budget is spent. */
export function altegioRetryPolicy(
  args: AltegioRetryPolicyArgs,
  retryAfterMs?: number,
): AltegioRetryVerdict {
  const delayMs = altegioRetryDelayMs(args);
  if (delayMs < 0) {
    return { kind: 'give_up' };
  }
  if (retryAfterMs != null && Number.isFinite(retryAfterMs) && retryAfterMs >= 0) {
    return { kind: 'retry', delayMs: Math.min(retryAfterMs, 5 * 60_000) + Math.floor(Math.random() * 151) };
  }
  return { kind: 'retry', delayMs };
}

/** Parse an HTTP `Retry-After` value: bare seconds or an HTTP-date. */
export function parseAltegioRetryAfterSeconds(value: string | null | undefined): number | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) {
    const seconds = Number(raw);
    return Number.isFinite(seconds) ? Math.min(300, seconds) : null;
  }
  const epoch = Date.parse(raw);
  if (Number.isNaN(epoch)) return null;
  return Math.min(300, Math.max(0, Math.ceil((epoch - Date.now()) / 1000)));
}

export function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    if (isNaN(ms) || ms <= 0) {
      resolve();
      return;
    }
    setTimeout(resolve, ms);
  });
}
