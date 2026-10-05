import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOW_PENDING_ACCESS_KEY } from '../decorators/allow-pending-access.decorator';
import { ALLOW_UNPAID_ACCESS_KEY } from '../decorators/allow-unpaid-access.decorator';
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
    const allowPending = this.reflector.getAllAndOverride<boolean>(ALLOW_PENDING_ACCESS_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    const allowUnpaid = this.reflector.getAllAndOverride<boolean>(ALLOW_UNPAID_ACCESS_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    return this.authorize(user, Boolean(allowPending), Boolean(allowUnpaid));
  }

  async authorize(user: JwtUser | undefined, allowPending = false, allowUnpaid = false): Promise<boolean> {
    if (!user) {
      throw new UnauthorizedException('Authentication must precede workspace authorization.');
    }

    const hasEmployeeRole = user.roleCodes.includes('employee');
    const hasPrivilegedRole = user.roleCodes.some((roleCode) =>
      ['tenant_owner', 'hr_admin', 'operations_admin', 'manager'].includes(roleCode),
    );

    if (!hasEmployeeRole) {
      return true;
    }

    if (!user.workspaceAccessAllowed) {
      if (allowPending) {
        return true;
      }

      throw new ForbiddenException('Your account is pending manager approval.');
    }

    if (hasPrivilegedRole || allowUnpaid) {
      return true;
    }

    const serviceActive = await this.billingService.isServiceActive(user.tenantId);
    if (!serviceActive) {
      throw this.billingService.buildPaymentRequiredException();
    }

    return true;
  }
}
