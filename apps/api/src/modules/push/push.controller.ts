import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { BulkJobActionDto } from '../../common/dto/bulk-job-action.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RegisterPushDeviceDto } from './dto/register-push-device.dto';
import { ListPushDeliveriesQueryDto } from './dto/list-push-deliveries-query.dto';
import { PushService } from './push.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Roles('employee', 'tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('me')
  mine(@CurrentUser() user: JwtUser) {
    return this.pushService.listMine(user.sub);
  }

  @Roles('employee', 'tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('deliveries')
  deliveries(@CurrentUser() user: JwtUser) {
    return this.pushService.listDeliveries(user.sub);
  }

  @Roles('employee', 'tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Post('register')
  register(@CurrentUser() user: JwtUser, @Body() dto: RegisterPushDeviceDto) {
    return this.pushService.register(user.sub, user.tenantId, dto);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('diagnostics')
  diagnostics(@CurrentUser() user: JwtUser, @Query() query: ListPushDeliveriesQueryDto) {
    return this.pushService.listTenantDeliveries(user.tenantId, query);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin')
  @Post('deliveries/:deliveryId/requeue')
  requeueDelivery(@CurrentUser() user: JwtUser, @Param('deliveryId') deliveryId: string) {
    return this.pushService.requeueDelivery(user.tenantId, user.sub, deliveryId);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin')
  @Post('deliveries/bulk-requeue')
  bulkRequeueDeliveries(@CurrentUser() user: JwtUser, @Body() dto: BulkJobActionDto) {
    return this.pushService.bulkRequeueDeliveries(user.tenantId, user.sub, dto.ids);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin')
  @Post('deliveries/:deliveryId/retry-receipt-check')
  retryReceiptCheck(@CurrentUser() user: JwtUser, @Param('deliveryId') deliveryId: string) {
    return this.pushService.retryReceiptCheck(user.tenantId, user.sub, deliveryId);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin')
  @Post('deliveries/bulk-retry-receipt-check')
  bulkRetryReceiptCheck(@CurrentUser() user: JwtUser, @Body() dto: BulkJobActionDto) {
    return this.pushService.bulkRetryReceiptCheck(user.tenantId, user.sub, dto.ids);
  }
}
