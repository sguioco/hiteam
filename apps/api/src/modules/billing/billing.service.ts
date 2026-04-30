import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { EmployeeInvitationStatus, EmployeeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type BillingCurrency = 'AED' | 'USD' | 'EUR';

type BillingPriceRule = {
  code: string;
  label: string;
  currency: BillingCurrency;
  unitAmount: number;
  approxUsd?: number;
  matchers: string[];
  timeZones?: string[];
};

const ACTIVE_INVITATION_STATUSES = [
  EmployeeInvitationStatus.INVITED,
  EmployeeInvitationStatus.PENDING_APPROVAL,
  EmployeeInvitationStatus.APPROVED,
];

const PRICE_RULES: BillingPriceRule[] = [
  {
    code: 'middle_east',
    label: 'Middle East',
    currency: 'AED',
    unitAmount: 11,
    approxUsd: 3,
    matchers: [
      'united arab emirates',
      'uae',
      'emirates',
      'saudi arabia',
      'qatar',
      'kuwait',
      'bahrain',
      'oman',
      'jordan',
      'lebanon',
      'israel',
      'palestine',
      'iraq',
      'iran',
      'yemen',
      'turkey',
    ],
    timeZones: [
      'Asia/Dubai',
      'Asia/Riyadh',
      'Asia/Qatar',
      'Asia/Kuwait',
      'Asia/Bahrain',
      'Asia/Muscat',
      'Asia/Amman',
      'Asia/Beirut',
      'Asia/Jerusalem',
      'Asia/Baghdad',
      'Asia/Tehran',
      'Asia/Aden',
      'Europe/Istanbul',
    ],
  },
  {
    code: 'us_uk',
    label: 'USA / United Kingdom',
    currency: 'USD',
    unitAmount: 5,
    matchers: [
      'united states',
      'usa',
      'u.s.',
      'america',
      'united kingdom',
      'great britain',
      'england',
      'scotland',
      'wales',
      'northern ireland',
    ],
    timeZones: [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'Europe/London',
    ],
  },
  {
    code: 'spain_france',
    label: 'Spain / France',
    currency: 'EUR',
    unitAmount: 3,
    matchers: ['spain', 'españa', 'france'],
    timeZones: ['Europe/Madrid', 'Europe/Paris'],
  },
  {
    code: 'uzbekistan',
    label: 'Uzbekistan',
    currency: 'USD',
    unitAmount: 1,
    matchers: ['uzbekistan', 'uzbek'],
    timeZones: ['Asia/Tashkent'],
  },
  {
    code: 'kazakhstan',
    label: 'Kazakhstan',
    currency: 'USD',
    unitAmount: 2,
    matchers: ['kazakhstan'],
    timeZones: ['Asia/Almaty', 'Asia/Aqtau', 'Asia/Aqtobe', 'Asia/Atyrau', 'Asia/Oral', 'Asia/Qostanay'],
  },
  {
    code: 'kyrgyzstan',
    label: 'Kyrgyzstan',
    currency: 'USD',
    unitAmount: 1,
    matchers: ['kyrgyzstan', 'kyrgyz'],
    timeZones: ['Asia/Bishkek'],
  },
  {
    code: 'armenia',
    label: 'Armenia',
    currency: 'USD',
    unitAmount: 2,
    matchers: ['armenia'],
    timeZones: ['Asia/Yerevan'],
  },
];

const FALLBACK_PRICE_RULE: BillingPriceRule = {
  code: 'standard',
  label: 'Standard',
  currency: 'USD',
  unitAmount: 3,
  matchers: [],
};

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(tenantId: string) {
    const subscription = await this.ensureSubscription(tenantId);
    const candidateFirstPaidAt =
      subscription.firstPaidAt ?? (subscription.paidSeats > 0 ? subscription.updatedAt : null);
    const billingPeriod = this.getBillingPeriod(candidateFirstPaidAt);
    const usagePeriod = billingPeriod ?? this.getCalendarMonthPeriod();
    const [{ activeEmployeeCount, pendingInvitationCount, usedSeats, billableSeats }, pricing] =
      await Promise.all([this.countSeatUsage(tenantId, usagePeriod), this.resolvePricing(tenantId)]);

    const paidSeats = subscription.paidSeats;
    const requiredSeats = Math.max(paidSeats, billableSeats);
    const missingSeats = Math.max(0, requiredSeats - paidSeats);
    const firstPaidAt = await this.ensureFirstPaidAt(subscription, missingSeats);
    const activeBillingPeriod = this.getBillingPeriod(firstPaidAt);
    const serviceActive = Boolean(firstPaidAt) && missingSeats === 0;
    const status = serviceActive ? subscription.status : 'PAYMENT_REQUIRED';

    return {
      status,
      paidSeats,
      requiredSeats,
      usedSeats,
      billableSeats,
      availableSeats: Math.max(0, paidSeats - usedSeats),
      missingSeats,
      activeEmployeeCount,
      pendingInvitationCount,
      monthlyTotal: requiredSeats * pricing.unitAmount,
      amountDue: missingSeats * pricing.unitAmount,
      billingStartedAt: firstPaidAt?.toISOString() ?? null,
      currentPeriodStart: activeBillingPeriod?.start.toISOString() ?? null,
      currentPeriodEnd: activeBillingPeriod?.end.toISOString() ?? null,
      serviceActive,
      price: pricing,
    };
  }

  async assertCanAddSeatOccupant(tenantId: string) {
    const summary = await this.getSummary(tenantId);
    return summary;
  }

  async isServiceActive(tenantId: string) {
    const summary = await this.getSummary(tenantId);
    return summary.serviceActive;
  }

  buildPaymentRequiredException() {
    return new HttpException(
      {
        message: 'Необходимо оплатить недостающие места в Billing, чтобы сотрудники могли пользоваться сервисом.',
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }

  private async ensureSubscription(tenantId: string) {
    const existing = await this.prisma.billingSubscription.findUnique({
      where: { tenantId },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.billingSubscription.create({
      data: {
        tenantId,
        paidSeats: 0,
      },
    });
  }

  private async ensureFirstPaidAt(
    subscription: {
      id: string;
      paidSeats: number;
      firstPaidAt: Date | null;
      updatedAt: Date;
    },
    missingSeats: number,
  ) {
    if (subscription.firstPaidAt || subscription.paidSeats <= 0 || missingSeats > 0) {
      return subscription.firstPaidAt;
    }

    const updated = await this.prisma.billingSubscription.update({
      where: { id: subscription.id },
      data: { firstPaidAt: subscription.updatedAt },
      select: { firstPaidAt: true },
    });

    return updated.firstPaidAt;
  }

  private async countSeatUsage(
    tenantId: string,
    period: { start: Date; end: Date },
  ) {
    const [
      activeEmployeeCount,
      recentlyTerminatedEmployeeCount,
      pendingInvitationCount,
      recentStandaloneInvitationCount,
    ] = await Promise.all([
      this.prisma.employee.count({
        where: {
          tenantId,
          status: {
            not: EmployeeStatus.TERMINATED,
          },
        },
      }),
      this.prisma.employee.count({
        where: {
          tenantId,
          status: EmployeeStatus.TERMINATED,
          updatedAt: {
            gte: period.start,
            lt: period.end,
          },
        },
      }),
      this.prisma.employeeInvitation.count({
        where: {
          tenantId,
          userId: null,
          status: {
            in: ACTIVE_INVITATION_STATUSES,
          },
        },
      }),
      this.prisma.employeeInvitation.count({
        where: {
          tenantId,
          userId: null,
          employeeId: null,
          invitedAt: {
            gte: period.start,
            lt: period.end,
          },
        },
      }),
    ]);
    const billableInvitationCount = Math.max(
      pendingInvitationCount,
      recentStandaloneInvitationCount,
    );

    return {
      activeEmployeeCount,
      pendingInvitationCount,
      usedSeats: activeEmployeeCount + pendingInvitationCount,
      billableSeats:
        activeEmployeeCount + recentlyTerminatedEmployeeCount + billableInvitationCount,
    };
  }

  private getCalendarMonthPeriod(referenceDate = new Date()) {
    const start = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1));
    const end = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() + 1, 1));

    return { start, end };
  }

  private getBillingPeriod(firstPaidAt: Date | null, referenceDate = new Date()) {
    if (!firstPaidAt) {
      return null;
    }

    let monthOffset =
      (referenceDate.getUTCFullYear() - firstPaidAt.getUTCFullYear()) * 12 +
      (referenceDate.getUTCMonth() - firstPaidAt.getUTCMonth());
    let start = this.addUtcMonths(firstPaidAt, monthOffset);

    if (start > referenceDate) {
      monthOffset -= 1;
      start = this.addUtcMonths(firstPaidAt, monthOffset);
    }

    let end = this.addUtcMonths(firstPaidAt, monthOffset + 1);

    if (referenceDate >= end) {
      monthOffset += 1;
      start = end;
      end = this.addUtcMonths(firstPaidAt, monthOffset + 1);
    }

    return { start, end };
  }

  private addUtcMonths(anchor: Date, monthOffset: number) {
    const targetMonth = new Date(
      Date.UTC(
        anchor.getUTCFullYear(),
        anchor.getUTCMonth() + monthOffset,
        1,
        anchor.getUTCHours(),
        anchor.getUTCMinutes(),
        anchor.getUTCSeconds(),
        anchor.getUTCMilliseconds(),
      ),
    );
    const lastDayOfTargetMonth = new Date(
      Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0),
    ).getUTCDate();

    return new Date(
      Date.UTC(
        targetMonth.getUTCFullYear(),
        targetMonth.getUTCMonth(),
        Math.min(anchor.getUTCDate(), lastDayOfTargetMonth),
        anchor.getUTCHours(),
        anchor.getUTCMinutes(),
        anchor.getUTCSeconds(),
        anchor.getUTCMilliseconds(),
      ),
    );
  }

  private async resolvePricing(tenantId: string) {
    const location = await this.prisma.location.findFirst({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
      select: {
        address: true,
        country: true,
        latitude: true,
        longitude: true,
        timezone: true,
      },
    });

    const locationConfigured = Boolean(
      location &&
        location.address !== 'Not set yet' &&
        !(location.latitude === 0 && location.longitude === 0),
    );
    const country = locationConfigured
      ? location?.country?.trim() || this.inferCountryFromAddress(location?.address)
      : null;
    const haystack = `${country ?? ''} ${location?.address ?? ''}`.toLowerCase();
    const matchedRule =
      (locationConfigured
        ? PRICE_RULES.find((rule) =>
            rule.matchers.some((matcher) => haystack.includes(matcher.toLowerCase())),
          ) ??
          PRICE_RULES.find((rule) =>
            Boolean(location?.timezone && rule.timeZones?.includes(location.timezone)),
          )
        : null) ??
      FALLBACK_PRICE_RULE;

    return {
      regionCode: matchedRule.code,
      regionLabel: matchedRule.label,
      country,
      currency: matchedRule.currency,
      unitAmount: matchedRule.unitAmount,
      approxUsd: matchedRule.approxUsd ?? null,
      locationConfigured,
    };
  }

  private inferCountryFromAddress(address?: string | null) {
    if (!address) {
      return null;
    }

    const parts = address
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    return parts[parts.length - 1] ?? null;
  }
}
