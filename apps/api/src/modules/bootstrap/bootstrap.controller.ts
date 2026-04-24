import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BootstrapService } from './bootstrap.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bootstrap')
export class BootstrapController {
  constructor(private readonly bootstrapService: BootstrapService) {}

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('tasks')
  tasks(
    @CurrentUser() user: JwtUser,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.bootstrapService.tasks(user, dateFrom, dateTo);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('attendance')
  attendance(
    @CurrentUser() user: JwtUser,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.bootstrapService.attendance(user, dateFrom, dateTo);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('employees')
  employees(@CurrentUser() user: JwtUser) {
    return this.bootstrapService.employees(user);
  }

  @Roles('employee', 'tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('schedule')
  schedule(
    @CurrentUser() user: JwtUser,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.bootstrapService.schedule(user, dateFrom, dateTo);
  }

  @Roles('employee', 'tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('dashboard')
  dashboard(@CurrentUser() user: JwtUser) {
    return this.bootstrapService.dashboard(user);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('analytics')
  analytics(@CurrentUser() user: JwtUser, @Query('days') days?: string) {
    return this.bootstrapService.analytics(user, days ? Number(days) : undefined);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('organization')
  organization(@CurrentUser() user: JwtUser) {
    return this.bootstrapService.organization(user);
  }

  @Roles('employee', 'tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('news')
  news(@CurrentUser() user: JwtUser) {
    return this.bootstrapService.news(user);
  }

  @Roles('employee', 'tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('leaderboard')
  leaderboard(@CurrentUser() user: JwtUser, @Query('month') month?: string) {
    return this.bootstrapService.leaderboard(user, month);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('biometric')
  biometric(@CurrentUser() user: JwtUser, @Query('result') result?: string) {
    return this.bootstrapService.biometric(user, result);
  }
}
