import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOW_PENDING_ACCESS_KEY } from '../decorators/allow-pending-access.decorator';
import { JwtUser } from '../interfaces/jwt-user.interface';

@Injectable()
export class WorkspaceAccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: JwtUser }>();
    const user = request?.user;

    if (!user) {
      return true;
    }

    if (user.workspaceAccessAllowed || !user.roleCodes.includes('employee')) {
      return true;
    }

    const isAllowed = this.reflector.getAllAndOverride<boolean>(ALLOW_PENDING_ACCESS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isAllowed) {
      return true;
    }

    throw new ForbiddenException('Your account is pending manager approval.');
  }
}
