import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddRequestCommentDto } from './dto/add-request-comment.dto';
import { BulkTimeOffAccrualDto } from './dto/bulk-time-off-accrual.dto';
import { CreateApprovalPolicyDto } from './dto/create-approval-policy.dto';
import { CreateRequestDto } from './dto/create-request.dto';
import { RequestCalendarQueryDto } from './dto/request-calendar-query.dto';
import { RequestActionDto } from './dto/request-action.dto';
import { TimeOffBalanceUpsertDto } from './dto/time-off-balance-upsert.dto';
import { RequestsService } from './requests.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Roles('employee', 'tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('me')
  mine(@CurrentUser() user: JwtUser) {
    return this.requestsService.listMine(user.sub);
  }

  @Roles('employee', 'tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('me/balances')
  myBalances(@CurrentUser() user: JwtUser) {
    return this.requestsService.getMyBalances(user.sub);
  }

  @Roles('employee', 'tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('me/calendar')
  myCalendar(@CurrentUser() user: JwtUser, @Query() query: RequestCalendarQueryDto) {
    return this.requestsService.getMyCalendar(user.sub, query);
  }

  @Roles('employee', 'tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateRequestDto) {
    return this.requestsService.create(user.sub, dto);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('inbox')
  inbox(@CurrentUser() user: JwtUser) {
    return this.requestsService.inbox(user.sub);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('policies')
  policies(@CurrentUser() user: JwtUser) {
    return this.requestsService.listPolicies(user.tenantId);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('balances')
  balances(@CurrentUser() user: JwtUser, @Query('search') search?: string) {
    return this.requestsService.listBalances(user.tenantId, search);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Post('balances/accruals')
  applyAccrual(@CurrentUser() user: JwtUser, @Body() dto: BulkTimeOffAccrualDto) {
    return this.requestsService.applyBulkAccrual(user.tenantId, user.sub, dto);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Post('balances/:employeeId')
  upsertBalance(
    @CurrentUser() user: JwtUser,
    @Param('employeeId') employeeId: string,
    @Body() dto: TimeOffBalanceUpsertDto,
  ) {
    return this.requestsService.upsertEmployeeBalance(user.tenantId, user.sub, employeeId, dto);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin')
  @Post('policies')
  createPolicy(@CurrentUser() user: JwtUser, @Body() dto: CreateApprovalPolicyDto) {
    return this.requestsService.createPolicy(user.tenantId, user.sub, dto);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin')
  @Delete('policies/:chainKey')
  deletePolicy(@CurrentUser() user: JwtUser, @Param('chainKey') chainKey: string) {
    return this.requestsService.deletePolicy(user.tenantId, user.sub, chainKey);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Post(':requestId/approve')
  approve(@CurrentUser() user: JwtUser, @Param('requestId') requestId: string, @Body() dto: RequestActionDto) {
    return this.requestsService.approve(user.sub, requestId, dto);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Post(':requestId/reject')
  reject(@CurrentUser() user: JwtUser, @Param('requestId') requestId: string, @Body() dto: RequestActionDto) {
    return this.requestsService.reject(user.sub, requestId, dto);
  }

  @Roles('employee', 'tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Post(':requestId/comments')
  addComment(@CurrentUser() user: JwtUser, @Param('requestId') requestId: string, @Body() dto: AddRequestCommentDto) {
    return this.requestsService.addComment(user.sub, requestId, dto.body);
  }

  @Roles('employee', 'tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get(':requestId')
  details(@CurrentUser() user: JwtUser, @Param('requestId') requestId: string) {
    return this.requestsService.getDetails(user.sub, requestId);
  }
}
