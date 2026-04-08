import { Body, Controller, Get, Param, Post, Query, Res, StreamableFile, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AttendanceActionDto } from './dto/attendance-action.dto';
import { AddAttendanceCorrectionCommentDto } from './dto/add-attendance-correction-comment.dto';
import { AttendanceCorrectionActionDto } from './dto/attendance-correction-action.dto';
import { AttendanceAuditQueryDto } from './dto/attendance-audit-query.dto';
import { AttendanceAnomaliesQueryDto } from './dto/attendance-anomalies-query.dto';
import { AttendanceHistoryExportQueryDto } from './dto/attendance-history-export-query.dto';
import { AttendanceHistoryQueryDto } from './dto/attendance-history-query.dto';
import { CorrectAttendanceSessionDto } from './dto/correct-attendance-session.dto';
import { CreateAttendanceCorrectionRequestDto } from './dto/create-attendance-correction-request.dto';
import { AttendanceService } from './attendance.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Roles('employee', 'tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('me/status')
  status(@CurrentUser() user: JwtUser) {
    return this.attendanceService.getMyStatus(user.sub);
  }

  @Roles('employee', 'tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('me/history')
  myHistory(@CurrentUser() user: JwtUser, @Query() query: AttendanceHistoryQueryDto) {
    return this.attendanceService.myHistory(user.sub, query);
  }

  @Roles('employee', 'tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Post('check-in')
  checkIn(@CurrentUser() user: JwtUser, @Body() dto: AttendanceActionDto) {
    return this.attendanceService.checkIn(user.sub, dto);
  }

  @Roles('employee', 'tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Post('check-out')
  checkOut(@CurrentUser() user: JwtUser, @Body() dto: AttendanceActionDto) {
    return this.attendanceService.checkOut(user.sub, dto);
  }

  @Roles('employee', 'tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Post('break/start')
  startBreak(@CurrentUser() user: JwtUser, @Body() dto: AttendanceActionDto) {
    return this.attendanceService.startBreak(user.sub, dto);
  }

  @Roles('employee', 'tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Post('break/end')
  endBreak(@CurrentUser() user: JwtUser, @Body() dto: AttendanceActionDto) {
    return this.attendanceService.endBreak(user.sub, dto);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('team/live')
  live(@CurrentUser() user: JwtUser) {
    return this.attendanceService.liveTeam(user.tenantId);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('team/anomalies')
  teamAnomalies(@CurrentUser() user: JwtUser, @Query() query: AttendanceAnomaliesQueryDto) {
    return this.attendanceService.teamAnomalies(user.tenantId, query);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('team/history')
  teamHistory(@CurrentUser() user: JwtUser, @Query() query: AttendanceHistoryQueryDto) {
    return this.attendanceService.teamHistory(user.tenantId, query);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('team/audit')
  teamAudit(@CurrentUser() user: JwtUser, @Query() query: AttendanceAuditQueryDto) {
    return this.attendanceService.teamAudit(user.tenantId, query);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('team/history/export')
  async exportHistory(
    @CurrentUser() user: JwtUser,
    @Query() query: AttendanceHistoryExportQueryDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const payload = await this.attendanceService.exportHistory(
      user.tenantId,
      user.sub,
      query.format ?? 'xlsx',
      query,
    );

    response.setHeader('Content-Type', payload.contentType);
    response.setHeader('Content-Disposition', `attachment; filename="${payload.fileName}"`);
    return new StreamableFile(payload.buffer);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('employees/:employeeId/history')
  employeeHistory(
    @CurrentUser() user: JwtUser,
    @Param('employeeId') employeeId: string,
    @Query() query: AttendanceHistoryQueryDto,
  ) {
    return this.attendanceService.employeeHistory(user.tenantId, employeeId, query);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Post('sessions/:sessionId/correct')
  correctSession(
    @CurrentUser() user: JwtUser,
    @Param('sessionId') sessionId: string,
    @Body() dto: CorrectAttendanceSessionDto,
  ) {
    return this.attendanceService.correctSession(user.tenantId, user.sub, user.roleCodes, sessionId, dto);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Post('sessions/:sessionId/correction-requests')
  createCorrectionRequest(
    @CurrentUser() user: JwtUser,
    @Param('sessionId') sessionId: string,
    @Body() dto: CreateAttendanceCorrectionRequestDto,
  ) {
    return this.attendanceService.createCorrectionRequest(user.tenantId, user.sub, sessionId, dto);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('corrections/inbox')
  correctionInbox(@CurrentUser() user: JwtUser) {
    return this.attendanceService.correctionInbox(user.sub);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Post('corrections/:requestId/approve')
  approveCorrectionRequest(
    @CurrentUser() user: JwtUser,
    @Param('requestId') requestId: string,
    @Body() dto: AttendanceCorrectionActionDto,
  ) {
    return this.attendanceService.approveCorrectionRequest(user.sub, requestId, dto);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Post('corrections/:requestId/reject')
  rejectCorrectionRequest(
    @CurrentUser() user: JwtUser,
    @Param('requestId') requestId: string,
    @Body() dto: AttendanceCorrectionActionDto,
  ) {
    return this.attendanceService.rejectCorrectionRequest(user.sub, requestId, dto);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Post('corrections/:requestId/comments')
  addCorrectionComment(
    @CurrentUser() user: JwtUser,
    @Param('requestId') requestId: string,
    @Body() dto: AddAttendanceCorrectionCommentDto,
  ) {
    return this.attendanceService.addCorrectionComment(user.sub, requestId, dto.body);
  }
}
