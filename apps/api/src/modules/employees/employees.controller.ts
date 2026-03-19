import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AllowPendingAccess } from '../../common/decorators/allow-pending-access.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { CreateEmployeeInvitationDto } from './dto/create-employee-invitation.dto';
import { ListEmployeesQueryDto } from './dto/list-employees-query.dto';
import { PublicCompanyCodeDto } from './dto/public-company-code.dto';
import { PublicCompanyJoinDto } from './dto/public-company-join.dto';
import { RegisterEmployeeInvitationDto } from './dto/register-employee-invitation.dto';
import { ReviewEmployeeInvitationDto } from './dto/review-employee-invitation.dto';
import { EmployeesService } from './employees.service';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('invitations/pending')
  pendingApprovals(@CurrentUser() user: JwtUser) {
    return this.employeesService.listPendingInvitations(user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Post('invitations')
  createInvitation(@CurrentUser() user: JwtUser, @Body() dto: CreateEmployeeInvitationDto) {
    return this.employeesService.createInvitation(user.tenantId, user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Post('invitations/:invitationId/resend')
  resendInvitation(@CurrentUser() user: JwtUser, @Param('invitationId') invitationId: string) {
    return this.employeesService.resendInvitation(user.tenantId, user.sub, invitationId);
  }

  @Get('invitations/public/:token')
  getPublicInvitation(@Param('token') token: string) {
    return this.employeesService.getInvitationByToken(token);
  }

  @Post('public/join/code/lookup')
  lookupCompanyCode(@Body() dto: PublicCompanyCodeDto) {
    return this.employeesService.lookupCompanyByCode(dto.code);
  }

  @Post('public/join/code/submit')
  submitJoinByCode(@Body() dto: PublicCompanyJoinDto) {
    return this.employeesService.submitJoinRequestByCompanyCode(dto);
  }

  @Post('invitations/public/:token/register')
  registerFromInvitation(@Param('token') token: string, @Body() dto: RegisterEmployeeInvitationDto) {
    return this.employeesService.registerFromInvitation(token, dto);
  }

  @UseGuards(JwtAuthGuard)
  @AllowPendingAccess()
  @Get('me/access-status')
  accessStatus(@CurrentUser() user: JwtUser) {
    return this.employeesService.getAccessStatus(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Patch('invitations/:invitationId/review')
  reviewInvitation(
    @CurrentUser() user: JwtUser,
    @Param('invitationId') invitationId: string,
    @Body() dto: ReviewEmployeeInvitationDto,
  ) {
    return this.employeesService.reviewInvitation(user.tenantId, user.sub, invitationId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get()
  list(@CurrentUser() user: JwtUser, @Query() query: ListEmployeesQueryDto) {
    return this.employeesService.list(user.tenantId, query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get(':employeeId')
  getById(@CurrentUser() user: JwtUser, @Param('employeeId') employeeId: string) {
    return this.employeesService.getById(user.tenantId, employeeId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('tenant_owner', 'hr_admin')
  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(user.tenantId, dto);
  }
}
