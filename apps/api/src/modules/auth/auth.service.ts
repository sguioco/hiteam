import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
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

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  private normalizeCompanyCode(value: string): string {
    return value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32);
  }

  private normalizeOrganizationName(value: string): string {
    return value.trim();
  }

  private async assertOrganizationAvailability(args: {
    tenantName: string;
    companyName: string;
    companyCode: string;
  }): Promise<void> {
    const [existingTenantName, existingCompanyCode, existingCompanyName] = await Promise.all([
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
        where: { code: args.companyCode },
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

    if (existingCompanyCode) {
      throw new ConflictException('Invite code already exists.');
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

  private async issueSessionTokens(user: {
    id: string;
    email: string;
    tenantId: string;
    workspaceAccessAllowed: boolean;
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
    user: { id: string; email: string; tenantId: string; roleCodes: string[]; workspaceAccessAllowed: boolean };
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

    const user = matches[0];

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('This account is inactive.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password.');
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

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        roleCodes,
        workspaceAccessAllowed: user.workspaceAccessAllowed,
      },
    };
  }

  async refresh(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; tenantId: string; roleCodes: string[]; workspaceAccessAllowed: boolean };
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

    if (!user || user.status !== UserStatus.ACTIVE) {
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
      user: {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        roleCodes,
        workspaceAccessAllowed: user.workspaceAccessAllowed,
      },
    };
  }

  async registerOwner(dto: RegisterOwnerDto): Promise<{ tenantId: string; userId: string }> {
    const tenantSlug = dto.tenantSlug.trim().toLowerCase();
    const tenantName = this.normalizeOrganizationName(dto.tenantName);
    const companyName = this.normalizeOrganizationName(dto.companyName);
    const companyCode = this.normalizeCompanyCode(dto.companyCode);
    const ownerEmail = dto.email.trim().toLowerCase();

    const existingTenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (existingTenant) {
      throw new ConflictException('Tenant slug already exists.');
    }

    if (!tenantName || !companyName) {
      throw new ConflictException('Organization name is required.');
    }

    if (!companyCode) {
      throw new ConflictException('Invite code is required.');
    }

    await this.assertOrganizationAvailability({
      tenantName,
      companyName,
      companyCode,
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

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: tenantName,
          slug: tenantSlug,
          timezone: dto.timezone ?? 'UTC',
          locale: 'ru',
        },
      });

      const company = await tx.company.create({
        data: {
          tenantId: tenant.id,
          name: companyName,
          code: companyCode,
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
      metadata: { email: ownerEmail, tenantSlug },
    });

    return result;
  }

  async registerOrganization(dto: RegisterOrganizationDto): Promise<{
    tenantId: string;
    tenantSlug: string;
    companyId: string;
    companyCode: string;
    managerEmail: string;
    managerSetupUrl: string;
  }> {
    const organizationName = this.normalizeOrganizationName(dto.organizationName);
    const managerEmail = dto.managerEmail.trim().toLowerCase();
    const companyCode = this.normalizeCompanyCode(dto.companyCode);

    if (!organizationName) {
      throw new ConflictException('Organization name is required.');
    }

    if (!companyCode) {
      throw new ConflictException('Invite code is required.');
    }

    await this.assertOrganizationAvailability({
      tenantName: organizationName,
      companyName: organizationName,
      companyCode,
    });
    await this.assertWorkspaceEmailAvailability(managerEmail);

    const tenantSlug = await this.buildUniqueTenantSlug(organizationName);
    const timezone = dto.timezone?.trim() || 'UTC';
    const token = randomBytes(24).toString('hex');

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: organizationName,
          slug: tenantSlug,
          timezone,
          locale: 'ru',
        },
      });

      const company = await tx.company.create({
        data: {
          tenantId: tenant.id,
          name: organizationName,
          code: companyCode,
        },
      });

      await tx.location.create({
        data: {
          tenantId: tenant.id,
          companyId: company.id,
          name: `${organizationName} HQ`,
          code: `HQ-${companyCode}`,
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
        },
        select: { id: true },
      });

      await tx.employeeInvitation.create({
        data: {
          tenantId: tenant.id,
          companyId: company.id,
          email: managerEmail,
          invitedByUserId: systemUser.id,
          tokenHash: this.hashInvitationToken(token),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: EmployeeInvitationStatus.INVITED,
        },
      });

      return {
        tenantId: tenant.id,
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
        companyCode,
        managerEmail,
      },
    });

    return {
      tenantId: result.tenantId,
      tenantSlug,
      companyId: result.companyId,
      companyCode,
      managerEmail,
      managerSetupUrl,
    };
  }

  async me(userId: string): Promise<{ id: string; email: string; tenantId: string; roleCodes: string[]; workspaceAccessAllowed: boolean }> {
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

    return {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roleCodes: user.roles.map((entry) => entry.role.code),
      workspaceAccessAllowed: user.workspaceAccessAllowed,
    };
  }
}
