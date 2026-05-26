import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BillingService } from './billing.service';

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('summary')
  summary(@CurrentUser() user: JwtUser) {
    return this.billingService.getSummary(user.tenantId);
  }

  @Post('checkout')
  checkout(@CurrentUser() user: JwtUser) {
    return this.billingService.createCheckoutSession(user.tenantId, user.sub);
  }

  @Post('portal')
  portal(@CurrentUser() user: JwtUser) {
    return this.billingService.createPortalSession(user.tenantId);
  }

  @Post('disconnect')
  disconnect(@CurrentUser() user: JwtUser) {
    return this.billingService.disconnectStripe(user.tenantId);
  }

  @Post('sync-seats')
  syncSeats(@CurrentUser() user: JwtUser) {
    return this.billingService.syncStripeSeatQuantity(user.tenantId);
  }
}
