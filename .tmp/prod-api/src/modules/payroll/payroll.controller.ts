import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateHolidayCalendarDayDto } from './dto/create-holiday-calendar-day.dto';
import { PayrollSummaryQueryDto } from './dto/payroll-summary-query.dto';
import { UpdatePayrollPolicyDto } from './dto/update-payroll-policy.dto';
import { PayrollService } from './payroll.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('summary')
  summary(@CurrentUser() user: JwtUser, @Query() query: PayrollSummaryQueryDto) {
    return this.payrollService.summary(user.tenantId, query.dateFrom, query.dateTo);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('export')
  async export(
    @CurrentUser() user: JwtUser,
    @Query() query: PayrollSummaryQueryDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const payload = await this.payrollService.exportSummary(
      user.tenantId,
      user.sub,
      query.format ?? 'xlsx',
      query.dateFrom,
      query.dateTo,
    );

    response.setHeader('Content-Type', payload.contentType);
    response.setHeader('Content-Disposition', `attachment; filename="${payload.fileName}"`);
    return new StreamableFile(payload.buffer);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('policy')
  policy(@CurrentUser() user: JwtUser) {
    return this.payrollService.getPolicy(user.tenantId);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('holidays')
  holidays(@CurrentUser() user: JwtUser) {
    return this.payrollService.listHolidays(user.tenantId);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin')
  @Post('policy')
  updatePolicy(@CurrentUser() user: JwtUser, @Body() dto: UpdatePayrollPolicyDto) {
    return this.payrollService.updatePolicy(user.tenantId, user.sub, dto);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin')
  @Post('holidays')
  createHoliday(@CurrentUser() user: JwtUser, @Body() dto: CreateHolidayCalendarDayDto) {
    return this.payrollService.createHoliday(user.tenantId, user.sub, dto);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin')
  @Delete('holidays/:holidayId')
  deleteHoliday(@CurrentUser() user: JwtUser, @Param('holidayId') holidayId: string) {
    return this.payrollService.deleteHoliday(user.tenantId, user.sub, holidayId);
  }
}
