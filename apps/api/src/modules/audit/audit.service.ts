import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    tenantId: string;
    actorUserId?: string;
    entityType: string;
    entityId: string;
    action: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenantId: params.tenantId,
        actorUserId: params.actorUserId,
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        metadataJson: params.metadata ? JSON.stringify(params.metadata) : undefined,
      },
    });
  }
}
