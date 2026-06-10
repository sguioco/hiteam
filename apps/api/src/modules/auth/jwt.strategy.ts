import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { PrismaService } from '../prisma/prisma.service';

const DEMO_OWNER_EMAIL = 'owner@demo.smart';
const DEMO_EMAIL_DOMAIN = '@demo.smart';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET ?? 'change-me-access-secret',
    });
  }

  async validate(payload: JwtUser): Promise<JwtUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        tenantId: true,
        email: true,
        status: true,
        workspaceAccessAllowed: true,
        preferredLocale: true,
        roles: {
          select: {
            role: {
              select: {
                code: true,
              },
            },
          },
        },
      },
    });

    const normalizedEmail = user?.email.trim().toLowerCase() ?? '';
    const blockedDemoAccount =
      normalizedEmail.endsWith(DEMO_EMAIL_DOMAIN) &&
      normalizedEmail !== DEMO_OWNER_EMAIL;

    if (!user || user.status !== UserStatus.ACTIVE || blockedDemoAccount) {
      throw new UnauthorizedException('This account is inactive.');
    }

    return {
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      roleCodes: user.roles.map((entry) => entry.role.code),
      workspaceAccessAllowed: user.workspaceAccessAllowed,
      preferredLocale: user.preferredLocale?.trim().toLowerCase() === 'ru' ? 'ru' : 'en',
    };
  }
}
