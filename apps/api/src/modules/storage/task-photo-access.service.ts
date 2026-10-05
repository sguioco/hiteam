import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmployeeScopeService } from '../../common/access/employee-scope.service';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';

@Injectable()
export class TaskPhotoAccessService {
  constructor(private readonly prisma: PrismaService, private readonly scopes: EmployeeScopeService) {}

  async findReadableProof(user: JwtUser, proofId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId: user.sub, tenantId: user.tenantId },
      select: { id: true, groupMemberships: { select: { groupId: true } } },
    });
    if (!employee) throw new NotFoundException('Photo proof was not found.');
    const scope = await this.scopes.where(user.tenantId, user.sub);
    const assignments = await this.prisma.userRole.findMany({
      where: { userId: user.sub, user: { tenantId: user.tenantId }, role: { code: 'manager' } },
      select: { scopeId: true, scopeType: true },
    });
    const locationIds = assignments.filter(a => a.scopeType === 'location').map(a => a.scopeId);
    const companyIds = assignments.filter(a => a.scopeType === 'company').map(a => a.scopeId);
    const groups = employee.groupMemberships.map(m => m.groupId);
    const proof = await this.prisma.taskPhotoProof.findFirst({
      where: {
        id: proofId, tenantId: user.tenantId, deletedAt: null, supersededByProofId: null,
        OR: [
          { task: { tenantId: user.tenantId, deletedAt: null, OR: [
            { managerEmployeeId: employee.id }, { assigneeEmployeeId: employee.id },
            { groupId: { in: groups } },
            { locationId: null, assigneeEmployee: scope },
            { assigneeEmployee: { companyId: { in: companyIds } } },
            { locationId: { in: locationIds } }, { location: { companyId: { in: companyIds } } },
            ...(scope.OR ? [] : [{ tenantId: user.tenantId }]),
          ] } },
          { taskCompletion: { tenantId: user.tenantId, taskTemplate: { isActive: true, tenantId: user.tenantId }, OR: [
            { assigneeEmployeeId: employee.id }, { assigneeEmployee: scope },
            { taskTemplate: { managerEmployeeId: employee.id } },
            { taskTemplate: { groupId: { in: groups } } },
          ] } },
        ],
      },
      select: { storageKey: true, fileName: true },
    });
    if (!proof) throw new NotFoundException('Photo proof was not found.');
    return proof;
  }
}
