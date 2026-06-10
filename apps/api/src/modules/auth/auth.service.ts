import { BadRequestException, Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterOrganizationDto } from './dto/register-organization.dto';
import { RegisterOwnerDto } from './dto/register-owner.dto';
import * as bcrypt from 'bcrypt';
import { Prisma, UserStatus, EmployeeStatus, EmployeeInvitationStatus } from '@prisma/client';
import { SignOptions } from 'jsonwebtoken';
import { randomBytes, createHash } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { KommoService } from '../kommo/kommo.service';

const DEMO_OWNER_EMAIL = 'owner@demo.smart';
const DEMO_EMAIL_DOMAIN = '@demo.smart';
const DEFAULT_ORGANIZATION_TRIAL_DAYS = 7;
const PROMO_TRIAL_SOURCE = 'PROMO_CODE';
const DEFAULT_TRIAL_SOURCE = 'DEFAULT_7D';

type PreferredLocale = 'en' | 'ru';

type AuthSessionUser = {
  id: string;
  email: string;
  tenantId: string;
  roleCodes: string[];
  workspaceAccessAllowed: boolean;
  preferredLocale: PreferredLocale;
};

type AuthUserWithRoles = {
  id: string;
  email: string;
  tenantId: string;
  workspaceAccessAllowed: boolean;
  preferredLocale: string | null;
  roles: Array<{ role: { code: string } }>;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    private readonly kommoService: KommoService,
  ) {}

  private normalizeOrganizationName(value: string): string {
    return value.trim();
  }

  private normalizePreferredLocale(value?: string | null): PreferredLocale {
    return value?.trim().toLowerCase() === 'ru' ? 'ru' : 'en';
  }

  private serializeAuthUser(
    user: AuthUserWithRoles,
    roleCodes = user.roles.map((entry) => entry.role.code),
  ): AuthSessionUser {
    return {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roleCodes,
      workspaceAccessAllowed: user.workspaceAccessAllowed,
      preferredLocale: this.normalizePreferredLocale(user.preferredLocale),
    };
  }

  private async assertOrganizationAvailability(args: {
    tenantName: string;
    companyName: string;
  }): Promise<void> {
    const [existingTenantName, existingCompanyName] = await Promise.all([
      this.prisma.tenant.findFirst({
        where: {
          name: {
            equals: args.tenantName,
            mode: 'insensitive',
          },
        },
        select: { id: true },
      }),
      this.prisma.company.findFirst({
        where: {
          name: {
            equals: args.companyName,
            mode: 'insensitive',
          },
        },
        select: { id: true },
      }),
    ]);

    if (existingTenantName || existingCompanyName) {
      throw new ConflictException('Organization with this name already exists.');
    }
  }

  private async assertWorkspaceEmailAvailability(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new ConflictException('Manager email is required.');
    }

    const [existingUser, existingInvitation] = await Promise.all([
      this.prisma.user.findFirst({
        where: {
          email: {
            equals: normalizedEmail,
            mode: 'insensitive',
          },
        },
        select: { id: true },
      }),
      this.prisma.employeeInvitation.findFirst({
        where: {
          email: {
            equals: normalizedEmail,
            mode: 'insensitive',
          },
          status: {
            in: [
              EmployeeInvitationStatus.INVITED,
              EmployeeInvitationStatus.PENDING_APPROVAL,
              EmployeeInvitationStatus.APPROVED,
            ],
          },
        },
        select: { id: true },
      }),
    ]);

    if (existingUser || existingInvitation) {
      throw new ConflictException('Manager email is already used in another workspace.');
    }
  }

  private buildTenantSlug(value: string): string {
    const normalized = value
      .trim()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);

    return normalized || 'company';
  }

  private buildCompanyCode(value: string): string {
    return this.buildTenantSlug(value).toUpperCase().replace(/-/g, '_').slice(0, 24);
  }

  private async buildUniqueTenantSlug(baseName: string): Promise<string> {
    const baseSlug = this.buildTenantSlug(baseName);

    const taken = await this.prisma.tenant.findMany({
      where: {
        slug: {
          startsWith: baseSlug,
        },
      },
      select: { slug: true },
    });

    const takenSlugs = new Set(taken.map((entry) => entry.slug));
    if (!takenSlugs.has(baseSlug)) {
      return baseSlug;
    }

    let index = 2;
    while (takenSlugs.has(`${baseSlug}-${index}`)) {
      index += 1;
    }

    return `${baseSlug}-${index}`;
  }

  private hashInvitationToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private isBlockedDemoAccount(email?: string | null): boolean {
    const normalizedEmail = email?.trim().toLowerCase() ?? '';
    return (
      normalizedEmail.endsWith(DEMO_EMAIL_DOMAIN) &&
      normalizedEmail !== DEMO_OWNER_EMAIL
    );
  }

  private normalizePromoCode(value?: string | null) {
    const normalized = value?.trim().toUpperCase().replace(/\s+/g, '') ?? '';
    return normalized || null;
  }

  private addDays(date: Date, days: number) {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private async createInitialTrialSubscription(
    tx: Prisma.TransactionClient,
    tenantId: string,
    rawPromoCode?: string | null,
  ) {
    const now = new Date();
    const promoCode = this.normalizePromoCode(rawPromoCode);
    let trialDays = DEFAULT_ORGANIZATION_TRIAL_DAYS;
    let trialSource = DEFAULT_TRIAL_SOURCE;

    if (promoCode) {
      const promo = await tx.trialPromoCode.findUnique({
        where: { code: promoCode },
      });

      if (
        !promo ||
        !promo.isActive ||
        (promo.expiresAt && promo.expiresAt <= now) ||
        promo.redeemedCount >= promo.maxRedemptions
      ) {
        throw new BadRequestException('Promo code is invalid or expired.');
      }

      const claim = await tx.trialPromoCode.updateMany({
        where: {
          id: promo.id,
          isActive: true,
          redeemedCount: { lt: promo.maxRedemptions },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        data: {
          redeemedCount: { increment: 1 },
        },
      });

      if (claim.count === 0) {
        throw new BadRequestException('Promo code is invalid or expired.');
      }

      await tx.trialPromoRedemption.create({
        data: {
          promoCodeId: promo.id,
          tenantId,
        },
      });

      trialDays = promo.trialDays;
      trialSource = PROMO_TRIAL_SOURCE;
    }

    return tx.billingSubscription.create({
      data: {
        tenantId,
        paidSeats: 0,
        status: 'TRIALING',
        trialStartedAt: now,
        trialEndsAt: this.addDays(now, trialDays),
        trialSource,
        promoCode,
      },
    });
  }

  private async issueSessionTokens(user: {
    id: string;
    email: string;
    tenantId: string;
    workspaceAccessAllowed: boolean;
    preferredLocale: string | null;
    roles: Array<{ role: { code: string } }>;
  }): Promise<{
    accessToken: string;
    refreshToken: string;
    refreshTokenHash: string;
    refreshExpiresAt: Date;
    roleCodes: string[];
  }> {
    const roleCodes = user.roles.map((entry) => entry.role.code);
    const payload = {
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      roleCodes,
      workspaceAccessAllowed: user.workspaceAccessAllowed,
      preferredLocale: this.normalizePreferredLocale(user.preferredLocale),
    };

    const accessExpiresIn = (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as SignOptions['expiresIn'];
    const refreshExpiresIn = (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as SignOptions['expiresIn'];

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: accessExpiresIn,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: refreshExpiresIn,
    });

    return {
      accessToken,
      refreshToken,
      refreshTokenHash: await bcrypt.hash(refreshToken, 10),
      refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      roleCodes,
    };
  }

  async login(dto: LoginDto): Promise<{
    accessToken: string;
    refreshToken: string;
    user: AuthSessionUser;
  }> {
    const identifier = (dto.identifier ?? dto.email ?? '').trim();
    if (!identifier) {
      throw new UnauthorizedException('Account identifier is required.');
    }

    const normalizedTenantSlug = dto.tenantSlug?.trim().toLowerCase();
    const isEmailIdentifier = identifier.includes('@');

    const where = normalizedTenantSlug
      ? {
          tenant: {
            slug: normalizedTenantSlug,
          },
          ...(isEmailIdentifier
            ? {
                email: identifier.toLowerCase(),
              }
            : {
                employee: {
                  phone: identifier,
                },
              }),
        }
      : isEmailIdentifier
        ? {
            email: identifier.toLowerCase(),
          }
        : {
            employee: {
              phone: identifier,
            },
          };

    const matches = await this.prisma.user.findMany({
      where,
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
      take: 2,
    });

    if (matches.length === 0) {
      throw new UnauthorizedException(
        isEmailIdentifier
          ? 'Account with this email is not registered.'
          : 'Account with this phone is not registered.',
      );
    }

    if (matches.length > 1) {
      throw new UnauthorizedException('Multiple workspaces found for this account. Contact support or use a direct invite link.');
    }

    let user = matches[0];

    if (!user || user.status !== UserStatus.ACTIVE || this.isBlockedDemoAccount(user.email)) {
      throw new UnauthorizedException('This account is inactive.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password.');
    }

    const requestedLocale = dto.locale
      ? this.normalizePreferredLocale(dto.locale)
      : null;

    if (requestedLocale && this.normalizePreferredLocale(user.preferredLocale) !== requestedLocale) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { preferredLocale: requestedLocale },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });
    }

    const {
      accessToken,
      refreshToken,
      refreshTokenHash,
      refreshExpiresAt,
      roleCodes,
    } = await this.issueSessionTokens(user);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        expiresAt: refreshExpiresAt,
      },
    });

    await this.auditService.log({
      tenantId: user.tenantId,
      actorUserId: user.id,
      entityType: 'session',
      entityId: user.id,
      action: 'auth.login',
      metadata: { email: user.email, roleCodes },
    });
    this.kommoService.recordLogin(user.tenantId, user.id);

    return {
      accessToken,
      refreshToken,
      user: this.serializeAuthUser(user, roleCodes),
    };
  }

  async refresh(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: AuthSessionUser;
  }> {
    const token = refreshToken.trim();
    if (!token) {
      throw new UnauthorizedException('Refresh token is required.');
    }

    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Refresh token is invalid.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        sessions: {
          where: {
            expiresAt: {
              gt: new Date(),
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE || this.isBlockedDemoAccount(user.email)) {
      throw new UnauthorizedException('Refresh token is invalid.');
    }

    let matchedSession: { id: string } | null = null;
    for (const session of user.sessions) {
      const matches = await bcrypt.compare(token, session.refreshTokenHash);
      if (matches) {
        matchedSession = { id: session.id };
        break;
      }
    }

    if (!matchedSession) {
      throw new UnauthorizedException('Refresh token is invalid.');
    }

    const {
      accessToken,
      refreshToken: nextRefreshToken,
      refreshTokenHash,
      refreshExpiresAt,
      roleCodes,
    } = await this.issueSessionTokens(user);

    await this.prisma.session.update({
      where: { id: matchedSession.id },
      data: {
        refreshTokenHash,
        expiresAt: refreshExpiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: nextRefreshToken,
      user: this.serializeAuthUser(user, roleCodes),
    };
  }

  async registerOwner(dto: RegisterOwnerDto): Promise<{ tenantId: string; tenantSlug: string; userId: string }> {
    const tenantName = this.normalizeOrganizationName(dto.tenantName);
    const companyName = this.normalizeOrganizationName(dto.companyName);
    const ownerEmail = dto.email.trim().toLowerCase();

    if (!tenantName || !companyName) {
      throw new ConflictException('Organization name is required.');
    }

    const requestedTenantSlug = dto.tenantSlug?.trim().toLowerCase();
    const tenantSlug = requestedTenantSlug || (await this.buildUniqueTenantSlug(tenantName));

    if (requestedTenantSlug) {
      const existingTenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
      if (existingTenant) {
        throw new ConflictException('Tenant slug already exists.');
      }
    }

    await this.assertOrganizationAvailability({
      tenantName,
      companyName,
    });
    await this.assertWorkspaceEmailAvailability(ownerEmail);

    const existingRole = await this.prisma.role.upsert({
      where: { code: 'tenant_owner' },
      update: {},
      create: {
        code: 'tenant_owner',
        name: 'Tenant Owner',
        description: 'Full company access',
      },
    });

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const preferredLocale = this.normalizePreferredLocale(dto.locale);

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: tenantName,
          slug: tenantSlug,
          timezone: dto.timezone ?? 'UTC',
          locale: preferredLocale,
        },
      });
      await this.createInitialTrialSubscription(tx, tenant.id, dto.promoCode);

      const company = await tx.company.create({
        data: {
          tenantId: tenant.id,
          name: companyName,
          code: this.buildCompanyCode(companyName),
        },
      });

      const department = await tx.department.create({
        data: {
          tenantId: tenant.id,
          name: 'Operations',
          code: 'OPS',
        },
      });

      const position = await tx.position.create({
        data: {
          tenantId: tenant.id,
          name: 'Owner',
          code: 'OWNER',
        },
      });

      const location = await tx.location.create({
        data: {
          tenantId: tenant.id,
          companyId: company.id,
          name: 'Primary Location',
          code: 'PRIMARY',
          address: 'Not set yet',
          latitude: 0,
          longitude: 0,
          timezone: dto.timezone ?? 'UTC',
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: ownerEmail,
          passwordHash,
          status: UserStatus.ACTIVE,
          preferredLocale,
        },
      });

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: existingRole.id,
          scopeType: 'tenant',
          scopeId: tenant.id,
        },
      });

      await tx.employee.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          companyId: company.id,
          departmentId: department.id,
          primaryLocationId: location.id,
          positionId: position.id,
          employeeNumber: dto.employeeNumber,
          firstName: dto.firstName,
          lastName: dto.lastName,
          status: EmployeeStatus.ACTIVE,
          hireDate: new Date(dto.hireDate),
        },
      });

      return { tenantId: tenant.id, userId: user.id };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    await this.auditService.log({
      tenantId: result.tenantId,
      actorUserId: result.userId,
      entityType: 'tenant',
      entityId: result.tenantId,
      action: 'auth.owner_registered',
      metadata: {
        email: ownerEmail,
        tenantSlug,
        promoCode: this.normalizePromoCode(dto.promoCode),
      },
    });
    this.kommoService.recordOrganizationRegistered(result.tenantId);

    return { ...result, tenantSlug };
  }

  async registerOrganization(dto: RegisterOrganizationDto): Promise<{
    tenantId: string;
    businessId: string;
    tenantSlug: string;
    companyId: string;
    managerEmail: string;
    managerSetupUrl: string;
  }> {
    const organizationName = this.normalizeOrganizationName(dto.organizationName);
    const managerEmail = dto.managerEmail.trim().toLowerCase();

    if (!organizationName) {
      throw new ConflictException('Organization name is required.');
    }

    await this.assertOrganizationAvailability({
      tenantName: organizationName,
      companyName: organizationName,
    });
    await this.assertWorkspaceEmailAvailability(managerEmail);

    const tenantSlug = await this.buildUniqueTenantSlug(organizationName);
    const timezone = dto.timezone?.trim() || 'UTC';
    const token = randomBytes(24).toString('hex');

    const preferredLocale = this.normalizePreferredLocale(dto.locale);

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: organizationName,
          slug: tenantSlug,
          timezone,
          locale: preferredLocale,
        },
      });
      await this.createInitialTrialSubscription(tx, tenant.id, dto.promoCode);

      const company = await tx.company.create({
        data: {
          tenantId: tenant.id,
          name: organizationName,
          code: this.buildCompanyCode(organizationName),
        },
      });

      await tx.location.create({
        data: {
          tenantId: tenant.id,
          companyId: company.id,
          name: `${organizationName} HQ`,
          code: 'HQ',
          address: 'Not set yet',
          latitude: 0,
          longitude: 0,
          geofenceRadiusMeters: 100,
          timezone,
        },
      });

      const systemUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: `system+${tenant.id}@smart.local`,
          passwordHash: await bcrypt.hash(randomBytes(16).toString('hex'), 10),
          status: UserStatus.ACTIVE,
          preferredLocale,
        },
        select: { id: true },
      });

      await tx.employeeInvitation.create({
        data: {
          tenantId: tenant.id,
          companyId: company.id,
          email: managerEmail,
          invitedByUserId: systemUser.id,
          locale: preferredLocale,
          tokenHash: this.hashInvitationToken(token),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: EmployeeInvitationStatus.INVITED,
        },
      });

      return {
        tenantId: tenant.id,
        businessId: tenant.businessId,
        companyId: company.id,
      };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    const webBaseUrl = (process.env.WEB_ADMIN_BASE_URL ?? process.env.APP_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    const managerSetupUrl = `${webBaseUrl}/join/manager/${token}`;

    await this.auditService.log({
      tenantId: result.tenantId,
      entityType: 'tenant',
      entityId: result.tenantId,
      action: 'auth.organization_registered',
      metadata: {
        organizationName,
        tenantSlug,
        managerEmail,
        promoCode: this.normalizePromoCode(dto.promoCode),
      },
    });
    this.kommoService.recordOrganizationRegistered(result.tenantId);

    return {
      tenantId: result.tenantId,
      businessId: result.businessId,
      tenantSlug,
      companyId: result.companyId,
      managerEmail,
      managerSetupUrl,
    };
  }

  async me(userId: string): Promise<AuthSessionUser> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    return this.serializeAuthUser(user);
  }

  async updatePreferredLocale(
    userId: string,
    locale: PreferredLocale,
  ): Promise<{ preferredLocale: PreferredLocale }> {
    const preferredLocale = this.normalizePreferredLocale(locale);

    await this.prisma.user.update({
      where: { id: userId },
      data: { preferredLocale },
    });

    return { preferredLocale };
  }

  async deleteAccount(userId: string): Promise<{ success: true }> {
    const disabledPasswordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          tenantId: true,
          employee: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!user) {
        throw new UnauthorizedException('Account is unavailable.');
      }

      const employeeId = user.employee?.id;

      await tx.session.deleteMany({ where: { userId: user.id } });
      await tx.notification.deleteMany({ where: { userId: user.id } });
      await tx.pushDelivery.deleteMany({ where: { userId: user.id } });
      await tx.pushDevice.deleteMany({ where: { userId: user.id } });

      if (employeeId) {
        await tx.biometricArtifact.deleteMany({ where: { employeeId } });
        await tx.biometricVerification.deleteMany({ where: { employeeId } });
        await tx.biometricJob.deleteMany({ where: { employeeId } });
        await tx.biometricProfile.deleteMany({ where: { employeeId } });

        await tx.employee.update({
          where: { id: employeeId },
          data: {
            firstName: 'Deleted',
            lastName: 'Account',
            middleName: null,
            birthDate: null,
            gender: null,
            phone: null,
            avatarStorageKey: null,
            avatarUrl: null,
            status: EmployeeStatus.TERMINATED,
          },
        });

        await tx.employeeInvitation.updateMany({
          where: { userId: user.id },
          data: {
            email: null,
            firstName: null,
            lastName: null,
            middleName: null,
            birthDate: null,
            gender: null,
            phone: null,
            avatarStorageKey: null,
            avatarUrl: null,
          },
        });
      }

      await tx.user.update({
        where: { id: user.id },
        data: {
          email: `deleted+${user.id}@deleted.local`,
          passwordHash: disabledPasswordHash,
          status: UserStatus.SUSPENDED,
          workspaceAccessAllowed: false,
          bannerTheme: 'blue',
        },
      });

      return user;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    await this.auditService.log({
      tenantId: result.tenantId,
      actorUserId: result.id,
      entityType: 'user',
      entityId: result.id,
      action: 'auth.account_deleted',
    });

    return { success: true };
  }
}
