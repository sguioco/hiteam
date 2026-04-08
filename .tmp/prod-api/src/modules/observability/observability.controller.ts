import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ObservabilityService } from './observability.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('observability')
export class ObservabilityController {
  constructor(private readonly observabilityService: ObservabilityService) {}

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('summary')
  summary(@CurrentUser() user: JwtUser) {
    return this.observabilityService.summary(user.tenantId);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin')
  @Post('queues/:queueKey/:action')
  setQueueState(
    @CurrentUser() user: JwtUser,
    @Param('queueKey') queueKey: 'exports' | 'biometric' | 'push',
    @Param('action') action: 'pause' | 'resume',
  ) {
    return this.observabilityService.setQueueState(user.tenantId, user.sub, queueKey, action);
  }
}
