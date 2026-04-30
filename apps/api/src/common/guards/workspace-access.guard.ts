import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOW_PENDING_ACCESS_KEY } from '../decorators/allow-pending-access.decorator';
import { JwtUser } from '../interfaces/jwt-user.interface';
import { BillingService } from '../../modules/billing/billing.service';

@Injectable()
export class WorkspaceAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly billingService: BillingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: JwtUser }>();
    const user = request?.user;

    if (!user) {
      return true;
    }

    const hasEmployeeRole = user.roleCodes.includes('employee');
    const hasPrivilegedRole = user.roleCodes.some((roleCode) =>
      ['tenant_owner', 'hr_admin', 'operations_admin', 'manager'].includes(roleCode),
    );

    if (!hasEmployeeRole) {
      return true;
    }

    if (!user.workspaceAccessAllowed) {
      const isAllowed = this.reflector.getAllAndOverride<boolean>(ALLOW_PENDING_ACCESS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (isAllowed) {
        return true;
      }

      throw new ForbiddenException('Your account is pending manager approval.');
    }

    if (hasPrivilegedRole) {
      return true;
    }

    const serviceActive = await this.billingService.isServiceActive(user.tenantId);
    if (!serviceActive) {
      throw this.billingService.buildPaymentRequiredException();
    }

    return true;
  }
}
