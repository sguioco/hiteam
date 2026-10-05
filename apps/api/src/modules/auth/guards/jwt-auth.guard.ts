import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WorkspaceAccessGuard } from '../../../common/guards/workspace-access.guard';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly workspaceAccess: WorkspaceAccessGuard) { super(); }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    return this.workspaceAccess.canActivate(context);
  }
}
