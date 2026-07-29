import {
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('billing/admin')
export class BillingStatsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  @Get('summary')
  async summary(
    @Headers('x-admin-token') token: string | undefined,
    @Query('periodDays') periodDaysRaw?: string,
  ) {
    this.assertAdminToken(token);
    const periodDays = this.parsePeriodDays(periodDaysRaw);
    const from = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    const [subscriptions, payments] = await Promise.all([
      this.prisma.billingSubscription.findMany({
        include: { tenant: { select: { name: true, slug: true } } },
      }),
      this.prisma.billingPayment.findMany({
        where: { status: 'PAID', paidAt: { gte: from } },
        orderBy: { paidAt: 'desc' },
      }),
    ]);

    const statuses: Record<string, number> = {};
    const tenants = subscriptions.map((subscription) => {
      const status = subscription.status.trim().toUpperCase() || 'UNKNOWN';
      statuses[status] = (statuses[status] ?? 0) + 1;
      return {
        name: subscription.tenant.name,
        slug: subscription.tenant.slug,
        status,
        paidSeats: subscription.paidSeats,
        stripeCurrentPeriodEnd: subscription.stripeCurrentPeriodEnd?.toISOString() ?? null,
        trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
        subscriptionActive: this.subscriptionActive(subscription),
      };
    });
    tenants.sort((a, b) => {
      if (a.subscriptionActive !== b.subscriptionActive) {
        return a.subscriptionActive ? -1 : 1;
      }
      const aEnd = a.stripeCurrentPeriodEnd ?? a.trialEndsAt ?? '9999-12-31';
      const bEnd = b.stripeCurrentPeriodEnd ?? b.trialEndsAt ?? '9999-12-31';
      return aEnd.localeCompare(bEnd) || a.name.localeCompare(b.name);
    });

    const revenueByCurrency: Record<string, number> = {};
    for (const payment of payments) {
      if (!payment.amountMinor || payment.amountMinor <= 0) {
        continue;
      }
      const currency = (payment.currency ?? 'UNKNOWN').trim().toUpperCase() || 'UNKNOWN';
      revenueByCurrency[currency] = (revenueByCurrency[currency] ?? 0) + payment.amountMinor;
    }

    return {
      periodDays,
      totalTenants: subscriptions.length,
      activeSubscriptions: tenants.filter((tenant) => tenant.subscriptionActive).length,
      statuses,
      paymentCount: payments.length,
      revenueByCurrency,
      tenants: tenants.slice(0, 50),
    };
  }

  private assertAdminToken(token: string | undefined) {
    const expected = this.configService.get<string>('BILLING_STATS_ADMIN_TOKEN')?.trim();
    if (!expected) {
      throw new HttpException({ message: 'billing_stats_not_configured' }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    const actual = (token ?? '').trim();
    if (
      actual.length !== expected.length ||
      !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
    ) {
      throw new HttpException({ message: 'invalid_admin_token' }, HttpStatus.UNAUTHORIZED);
    }
  }

  private parsePeriodDays(raw: string | undefined) {
    const value = Number(raw ?? 30);
    return Number.isInteger(value) && value >= 1 && value <= 365 ? value : 30;
  }

  private subscriptionActive(subscription: {
    status: string;
    stripeCurrentPeriodEnd: Date | null;
    trialEndsAt: Date | null;
    firstPaidAt: Date | null;
  }) {
    const now = Date.now();
    const status = subscription.status.trim().toUpperCase();
    const paidActive =
      !['CANCELED', 'CANCELLED', 'PAYMENT_REQUIRED', 'UNPAID', 'EXPIRED'].includes(status) &&
      Boolean(subscription.stripeCurrentPeriodEnd && subscription.stripeCurrentPeriodEnd.getTime() > now);
    const trialActive = Boolean(
      !subscription.firstPaidAt &&
        subscription.trialEndsAt &&
        subscription.trialEndsAt.getTime() > now,
    );
    return paidActive || trialActive;
  }
}
