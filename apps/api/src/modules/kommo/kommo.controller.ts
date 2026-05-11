import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { KommoService } from './kommo.service';

@Controller('kommo')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('tenant_owner', 'hr_admin', 'operations_admin')
export class KommoController {
  constructor(private readonly kommoService: KommoService) {}

  @Get('status')
  status(@CurrentUser() user: JwtUser) {
    return this.kommoService.getTenantStatus(user.tenantId);
  }

  @Post('sync')
  sync(@CurrentUser() user: JwtUser) {
    return this.kommoService.manualSyncTenant(user.tenantId);
  }
}
