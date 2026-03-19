import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateShiftDto } from './dto/create-shift.dto';
import { CreateShiftTemplateDto } from './dto/create-shift-template.dto';
import { ScheduleService } from './schedule.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Roles('tenant_owner', 'operations_admin', 'manager', 'hr_admin')
  @Get('templates')
  templates(@CurrentUser() user: JwtUser) {
    return this.scheduleService.listTemplates(user.tenantId);
  }

  @Roles('tenant_owner', 'operations_admin', 'manager', 'hr_admin')
  @Post('templates')
  createTemplate(@CurrentUser() user: JwtUser, @Body() dto: CreateShiftTemplateDto) {
    return this.scheduleService.createTemplate(user.tenantId, user.sub, dto);
  }

  @Roles('tenant_owner', 'operations_admin', 'manager', 'hr_admin')
  @Get('shifts')
  shifts(@CurrentUser() user: JwtUser) {
    return this.scheduleService.listShifts(user.tenantId);
  }

  @Roles('tenant_owner', 'operations_admin', 'manager', 'hr_admin')
  @Post('shifts')
  createShift(@CurrentUser() user: JwtUser, @Body() dto: CreateShiftDto) {
    return this.scheduleService.createShift(user.tenantId, user.sub, dto);
  }

  @Roles('employee', 'tenant_owner', 'operations_admin', 'manager', 'hr_admin')
  @Get('me')
  me(@CurrentUser() user: JwtUser) {
    return this.scheduleService.myShifts(user.sub);
  }
}
