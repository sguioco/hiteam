import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsDateString, IsOptional } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AltegioStaffScheduleSyncService } from './altegio-staff-schedule-sync.service';

class SyncScheduleDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

@Controller('altegio/sync')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
export class AltegioSyncController {
  constructor(private readonly syncService: AltegioStaffScheduleSyncService) {}

  @Get('status')
  status(@CurrentUser() user: JwtUser) {
    return this.syncService.getStatus(user.tenantId);
  }

  @Post('employees')
  syncEmployees(@CurrentUser() user: JwtUser) {
    return this.syncService.syncEmployees(user.tenantId);
  }

  @Post('schedule')
  syncSchedule(@CurrentUser() user: JwtUser, @Body() body: SyncScheduleDto) {
    return this.syncService.syncSchedule(user.tenantId, {
      from: body.from ? new Date(body.from) : undefined,
      to: body.to ? new Date(body.to) : undefined,
    });
  }

  @Post()
  syncAll(@CurrentUser() user: JwtUser) {
    return this.syncService.syncAll(user.tenantId);
  }
}
