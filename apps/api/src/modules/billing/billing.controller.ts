import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AltegioMarketplaceBillingService } from './altegio-marketplace-billing.service';
import { BillingService, type BillingCheckoutRequest } from './billing.service';
import { AltegioConnectDto } from './dto/altegio-connect.dto';

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly altegioMarketplaceBilling: AltegioMarketplaceBillingService,
  ) {}

  @Get('summary')
  summary(@CurrentUser() user: JwtUser) {
    return this.billingService.getSummary(user.tenantId, { syncMarketplace: true });
  }

  @Post('checkout')
  checkout(@CurrentUser() user: JwtUser, @Body() body: BillingCheckoutRequest = {}) {
    return this.billingService.createCheckoutSession(user.tenantId, user.sub, body);
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

  @Post('altegio/connect')
  connectAltegio(@CurrentUser() user: JwtUser, @Body() body: AltegioConnectDto) {
    return this.billingService.connectAltegioMarketplace(user.tenantId, {
      locationId: body.locationId,
      applicationId: body.applicationId,
    });
  }

  @Post('altegio/disconnect')
  disconnectAltegio(@CurrentUser() user: JwtUser) {
    return this.billingService.disconnectAltegioMarketplace(user.tenantId);
  }

  @Post('altegio/sync')
  syncAltegio(@CurrentUser() user: JwtUser) {
    return this.billingService.syncAltegioMarketplace(user.tenantId);
  }

  @Get('altegio/status')
  altegioStatus(@CurrentUser() user: JwtUser) {
    return this.altegioMarketplaceBilling.getMarketplaceSummary(user.tenantId);
  }
}
