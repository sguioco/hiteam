import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth/auth.service';
import { EmployeeInvitationsMailerService } from '../employees/employee-invitations.mailer';
import { RegisterOrganizationDto } from '../auth/dto/register-organization.dto';
import { GenerateTrialPromoCodesDto } from './dto/generate-trial-promo-codes.dto';
import { SyncKommoTenantsDto } from './dto/sync-kommo-tenants.dto';
import { KommoService } from '../kommo/kommo.service';

const DEFAULT_ORGANIZATION_TRIAL_DAYS = 7;

@Injectable()
export class SystemService {
  private readonly logger = new Logger(SystemService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly employeeInvitationsMailer: EmployeeInvitationsMailerService,
    private readonly kommoService: KommoService,
  ) {}

  async createTenant(dto: CreateTenantDto) {
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });
    if (existingTenant) {
      throw new ConflictException('Tenant slug already exists.');
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        name: 'New Company',
        slug: dto.slug,
      },
    });
    await this.prisma.billingSubscription.create({
      data: {
        tenantId: tenant.id,
        paidSeats: 0,
        status: 'TRIALING',
        trialStartedAt: new Date(),
        trialEndsAt: new Date(Date.now() + DEFAULT_ORGANIZATION_TRIAL_DAYS * 24 * 60 * 60 * 1000),
        trialSource: 'DEFAULT_7D',
      },
    });

    // Create a system user to act as the inviter
    const systemUser = await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: `system+${tenant.id}@smart.local`,
        passwordHash: await bcrypt.hash(randomBytes(16).toString('hex'), 10),
        status: 'ACTIVE',
      },
    });

    // We can use the existing EmployeeInvitation flow, but mark the system user as the inviter
    const token = randomBytes(24).toString('hex');
    const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');

    const invitation = await this.prisma.employeeInvitation.create({
      data: {
        tenantId: tenant.id,
        email: dto.managerEmail,
        invitedByUserId: systemUser.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        status: 'INVITED',
      },
    });

    const webBaseUrl = (process.env.WEB_ADMIN_BASE_URL ?? process.env.APP_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    const setupUrl = `${webBaseUrl}/join/manager/${token}`;
    let managerEmailDelivery = {
      status: 'failed',
      provider: 'none',
      errorMessage: 'Email delivery was not attempted.',
    };

    try {
      const delivery = await this.employeeInvitationsMailer.sendManagerSetupEmail({
        email: dto.managerEmail,
        companyName: tenant.name,
        tenantName: tenant.name,
        setupUrl,
      });
      managerEmailDelivery = {
        status: delivery.status,
        provider: delivery.provider,
        errorMessage: delivery.errorMessage ?? '',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Unable to send tenant manager setup email to ${dto.managerEmail}: ${errorMessage}`);
      managerEmailDelivery = {
        status: 'failed',
        provider: 'none',
        errorMessage,
      };
    }

    return {
      tenantId: tenant.id,
      businessId: tenant.businessId,
      slug: tenant.slug,
      invitationId: invitation.id,
      token,
      setupUrl,
      managerEmailDeliveryStatus: managerEmailDelivery.status,
      managerEmailDeliveryProvider: managerEmailDelivery.provider,
      managerEmailDeliveryError: managerEmailDelivery.errorMessage || undefined,
    };
  }

  async createOrganization(dto: RegisterOrganizationDto) {
    return this.authService.registerOrganization(dto);
  }

  async generateTrialPromoCodes(dto: GenerateTrialPromoCodesDto) {
    const count = dto.count ?? 10;
    const trialDays = dto.trialDays ?? 30;
    const maxRedemptions = dto.maxRedemptions ?? 1;
    const prefix = this.normalizePromoPrefix(dto.prefix ?? 'HITEAM30');
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    const items: Array<{
      id: string;
      code: string;
      trialDays: number;
      maxRedemptions: number;
      expiresAt: Date | null;
    }> = [];
    let attempts = 0;

    while (items.length < count && attempts < count * 5) {
      attempts += 1;
      const code = `${prefix}-${randomBytes(4).toString('hex').toUpperCase()}`;
      try {
        const promoCode = await this.prisma.trialPromoCode.create({
          select: {
            id: true,
            code: true,
            trialDays: true,
            maxRedemptions: true,
            expiresAt: true,
          },
          data: {
            code,
            trialDays,
            maxRedemptions,
            expiresAt,
          },
        });
        items.push(promoCode);
      } catch {
        // Retry on a rare generated-code collision.
      }
    }

    if (items.length < count) {
      throw new ConflictException('Unable to generate unique promo codes. Try again.');
    }

    return { items };
  }

  async syncKommoTenants(dto: SyncKommoTenantsDto = {}) {
    return this.kommoService.syncAllTenants({
      tenantId: dto.tenantId,
      limit: dto.limit,
    });
  }

  private normalizePromoPrefix(value: string) {
    return (
      value
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 24) || 'HITEAM30'
    );
  }
}
