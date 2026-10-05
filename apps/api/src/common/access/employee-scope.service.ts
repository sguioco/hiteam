import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../modules/prisma/prisma.service';

@Injectable()
export class EmployeeScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async where(tenantId: string, actorUserId: string): Promise<Prisma.EmployeeWhereInput> {
    const assignments = await this.prisma.userRole.findMany({
      where: { userId: actorUserId, user: { tenantId } },
      select: { scopeType: true, scopeId: true, role: { select: { code: true } } },
    });
    const privileged = assignments.filter(a =>
      ['tenant_owner', 'hr_admin', 'operations_admin', 'manager'].includes(a.role.code));
    if (privileged.some(a => a.scopeType === 'tenant' && a.scopeId === tenantId)) {
      return { tenantId };
    }
    const companyIds = privileged.filter(a => a.scopeType === 'company').map(a => a.scopeId);
    const locationIds = privileged.filter(a => a.scopeType === 'location').map(a => a.scopeId);
    return {
      tenantId,
      OR: [
        { companyId: { in: companyIds } },
        { primaryLocationId: { in: locationIds } },
        { locationAssignments: { some: { locationId: { in: locationIds }, unassignedAt: null } } },
      ],
    };
  }

  async assertEmployees(tenantId: string, actorUserId: string, employeeIds: string[]) {
    const ids = [...new Set(employeeIds)];
    const count = await this.prisma.employee.count({
      where: { AND: [await this.where(tenantId, actorUserId), { id: { in: ids } }] },
    });
    if (count !== ids.length) throw new ForbiddenException('Employee is outside your permitted scope.');
  }
}
