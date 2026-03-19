import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SystemService {
  constructor(private readonly prisma: PrismaService) {}

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

    return {
      tenantId: tenant.id,
      slug: tenant.slug,
      invitationId: invitation.id,
      token,
      // Provide a generic URL that the frontend can use or map to
      setupUrl: `/join/manager/${token}`,
    };
  }
}
