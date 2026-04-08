import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { BulkJobActionDto } from '../../common/dto/bulk-job-action.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateExportJobDto } from './dto/create-export-job.dto';
import { ListExportJobsQueryDto } from './dto/list-export-jobs-query.dto';
import { ExportsService } from './exports.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('exports')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Post('attendance')
  createAttendanceJob(@CurrentUser() user: JwtUser, @Body() dto: CreateExportJobDto) {
    return this.exportsService.createAttendanceExportJob(user.tenantId, user.sub, dto);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Post('payroll')
  createPayrollJob(@CurrentUser() user: JwtUser, @Body() dto: CreateExportJobDto) {
    return this.exportsService.createPayrollExportJob(user.tenantId, user.sub, dto);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('jobs')
  listJobs(@CurrentUser() user: JwtUser, @Query() query: ListExportJobsQueryDto) {
    return this.exportsService.listJobs(user.tenantId, query);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('jobs/:jobId')
  getJob(@CurrentUser() user: JwtUser, @Param('jobId') jobId: string) {
    return this.exportsService.getJob(user.tenantId, jobId);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin')
  @Post('jobs/:jobId/requeue')
  requeueJob(@CurrentUser() user: JwtUser, @Param('jobId') jobId: string) {
    return this.exportsService.requeueJob(user.tenantId, user.sub, jobId);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin')
  @Post('jobs/bulk-requeue')
  bulkRequeueJobs(@CurrentUser() user: JwtUser, @Body() dto: BulkJobActionDto) {
    return this.exportsService.bulkRequeueJobs(user.tenantId, user.sub, dto.ids);
  }
}
