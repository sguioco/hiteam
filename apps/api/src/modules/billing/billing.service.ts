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
    const [{ activeEmployeeCount, pendingInvitationCount, usedSeats }, pricing] =
      await Promise.all([this.countSeatUsage(tenantId), this.resolvePricing(tenantId)]);

    const subscription = await this.ensureSubscription(tenantId, usedSeats);
    const paidSeats = subscription.paidSeats;
    const availableSeats = Math.max(0, paidSeats - usedSeats);

    return {
      status: subscription.status,
      paidSeats,
      usedSeats,
      availableSeats,
      activeEmployeeCount,
      pendingInvitationCount,
      monthlyTotal: paidSeats * pricing.unitAmount,
      nextSeatAmount: pricing.unitAmount,
      price: pricing,
    };
  }

  async addSeats(tenantId: string, seats: number) {
    const normalizedSeats = Math.max(1, Math.floor(seats));
    const { usedSeats } = await this.countSeatUsage(tenantId);
    await this.ensureSubscription(tenantId, usedSeats);

    await this.prisma.billingSubscription.update({
      where: { tenantId },
      data: {
        paidSeats: {
          increment: normalizedSeats,
        },
      },
    });

    return this.getSummary(tenantId);
  }

  async assertCanAddSeatOccupant(tenantId: string) {
    const summary = await this.getSummary(tenantId);

    if (summary.availableSeats > 0) {
      return summary;
    }

    throw new HttpException(
      {
        message:
          'Недостаточно оплаченных мест. Добавьте место в Billing, чтобы пригласить сотрудника.',
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }

  private async ensureSubscription(tenantId: string, usedSeats: number) {
    const existing = await this.prisma.billingSubscription.findUnique({
      where: { tenantId },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.billingSubscription.create({
      data: {
        tenantId,
        paidSeats: Math.max(1, usedSeats),
      },
    });
  }

  private async countSeatUsage(tenantId: string) {
    const [activeEmployeeCount, pendingInvitationCount] = await Promise.all([
      this.prisma.employee.count({
        where: {
          tenantId,
          status: {
            not: EmployeeStatus.TERMINATED,
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
    ]);

    return {
      activeEmployeeCount,
      pendingInvitationCount,
      usedSeats: activeEmployeeCount + pendingInvitationCount,
    };
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
