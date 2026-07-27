export type MarketplaceSubscriptionSnapshot = {
  connectionStatus: string;
  periodStart: Date | null;
  periodEnd: Date | null;
  isTrial: boolean;
  paymentSum: number | null;
};

export function parseAltegioMarketplaceDatetime(value: unknown): Date | null {
  const raw = String(value || '').trim();
  if (!raw) {
    return null;
  }

  const normalized = raw.replace('Z', '+00:00');
  try {
    if (normalized.includes(' ') && !normalized.includes('T')) {
      const parsed = new Date(`${normalized.replace(' ', 'T')}Z`);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

export function formatAltegioMarketplaceDatetime(value: Date): string {
  const utc = new Date(value.getTime());
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${utc.getUTCFullYear()}-${pad(utc.getUTCMonth() + 1)}-${pad(utc.getUTCDate())} ${pad(utc.getUTCHours())}:${pad(utc.getUTCMinutes())}:${pad(utc.getUTCSeconds())}`;
}

export function parseMarketplaceSubscriptionSnapshot(
  payload: Record<string, unknown>,
): MarketplaceSubscriptionSnapshot {
  const data =
    payload.data && typeof payload.data === 'object'
      ? (payload.data as Record<string, unknown>)
      : {};
  const connection =
    data.connection_status && typeof data.connection_status === 'object'
      ? (data.connection_status as Record<string, unknown>)
      : {};
  const connectionStatus = String(connection.status || '')
    .trim()
    .toLowerCase();

  const payments = Array.isArray(data.payments)
    ? data.payments.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
    : [];
  const activePayments = payments.filter((row) => !Boolean(row.is_refunded));

  let periodStart: Date | null = null;
  let periodEnd: Date | null = null;
  let paymentSum: number | null = null;

  if (activePayments.length > 0) {
    const picked = activePayments.reduce((best, row) => {
      const end = parseAltegioMarketplaceDatetime(row.period_to);
      const bestEnd = parseAltegioMarketplaceDatetime(best.period_to);
      if (!bestEnd) return row;
      if (!end) return best;
      return end.getTime() > bestEnd.getTime() ? row : best;
    });

    periodStart = parseAltegioMarketplaceDatetime(picked.period_from);
    periodEnd = parseAltegioMarketplaceDatetime(picked.period_to);
    const rawSum = Number(picked.payment_sum);
    paymentSum = Number.isFinite(rawSum) ? rawSum : null;
  }

  let isTrial = paymentSum !== null && paymentSum <= 0;
  if (paymentSum === null && connectionStatus === 'active') {
    isTrial = true;
  }

  return {
    connectionStatus,
    periodStart,
    periodEnd,
    isTrial,
    paymentSum,
  };
}

export function shouldPushLocalPeriodToAltegio(args: {
  localEnd: Date;
  altegioEnd: Date | null;
  alignIfMismatch?: boolean;
}) {
  if (!args.altegioEnd) {
    return true;
  }
  const altegioEndMs = args.altegioEnd.getTime();
  const localEndMs = args.localEnd.getTime();
  if (localEndMs > altegioEndMs + 60_000) {
    return true;
  }
  if (args.alignIfMismatch && Math.abs(localEndMs - altegioEndMs) > 60_000) {
    return true;
  }
  return false;
}

export function resolveMarketplaceStatusFromSnapshot(args: {
  snapshot: MarketplaceSubscriptionSnapshot;
  localStatus: string | null | undefined;
  localPeriodEnd: Date | null;
  hasStripeSubscription: boolean;
}) {
  const now = Date.now();
  if (args.snapshot.connectionStatus === 'freezed') {
    return 'CANCELED';
  }

  const localEnd = args.localPeriodEnd;
  const localStatus = String(args.localStatus || '')
    .trim()
    .toUpperCase();
  const localPeriodIsActive = Boolean(
    localEnd &&
      localEnd.getTime() > now &&
      (localStatus === 'ACTIVE' || localStatus === 'TRIALING'),
  );

  if (args.snapshot.periodEnd && args.snapshot.periodEnd.getTime() < now && !localPeriodIsActive) {
    return 'CANCELED';
  }
  if (args.hasStripeSubscription && !args.snapshot.isTrial) {
    return 'ACTIVE';
  }
  if (args.snapshot.connectionStatus === 'active' || args.snapshot.connectionStatus === 'pending') {
    return args.snapshot.isTrial ? 'TRIALING' : 'ACTIVE';
  }
  return localStatus || 'CANCELED';
}
