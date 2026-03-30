import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { BulkJobActionDto } from '../../common/dto/bulk-job-action.dto';
import { AllowPendingAccess } from '../../common/decorators/allow-pending-access.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StartEnrollmentDto } from './dto/start-enrollment.dto';
import { CompleteEnrollmentDto } from './dto/complete-enrollment.dto';
import { VerifyBiometricDto } from './dto/verify-biometric.dto';
import { CreateLivenessBootstrapDto } from './dto/create-liveness-bootstrap.dto';
import { BiometricReviewsQueryDto } from './dto/biometric-reviews-query.dto';
import { BiometricHistoryQueryDto } from './dto/biometric-history-query.dto';
import { ReviewBiometricVerificationDto } from './dto/review-biometric-verification.dto';
import { ListTeamBiometricJobsQueryDto } from './dto/list-team-biometric-jobs-query.dto';
import { BiometricService } from './biometric.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@AllowPendingAccess()
@Controller('biometric')
export class BiometricController {
  constructor(private readonly biometricService: BiometricService) {}

  @Roles('employee', 'tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('policy')
  policy(@CurrentUser() user: JwtUser) {
    return this.biometricService.getPolicy(user.sub);
  }

  @Roles('employee', 'tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Post('enroll/start')
  startEnrollment(@CurrentUser() user: JwtUser, @Body() dto: StartEnrollmentDto) {
    return this.biometricService.startEnrollment(user.sub, dto);
  }

  @Roles('employee', 'tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Post('enroll/complete')
  completeEnrollment(@CurrentUser() user: JwtUser, @Body() dto: CompleteEnrollmentDto) {
    return this.biometricService.completeEnrollment(user.sub, dto);
  }

  @Roles('employee', 'tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Post('liveness/aws/bootstrap')
  createAwsLivenessBootstrap(@CurrentUser() user: JwtUser, @Body() dto: CreateLivenessBootstrapDto) {
    return this.biometricService.createAwsLivenessBootstrap(user.sub, dto.mode ?? 'verify');
  }

  @Roles('employee', 'tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Post('verify')
  verify(@CurrentUser() user: JwtUser, @Body() dto: VerifyBiometricDto) {
    return this.biometricService.verify(user.sub, dto);
  }

  @Roles('employee', 'tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Post('verify/async')
  verifyAsync(@CurrentUser() user: JwtUser, @Body() dto: VerifyBiometricDto) {
    return this.biometricService.queueVerify(user.sub, dto);
  }

  @Roles('employee', 'tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('jobs/me')
  myJobs(@CurrentUser() user: JwtUser) {
    return this.biometricService.listMyJobs(user.sub);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('jobs/team')
  teamJobs(@CurrentUser() user: JwtUser, @Query() query: ListTeamBiometricJobsQueryDto) {
    return this.biometricService.listTeamJobs(user.tenantId, query);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin')
  @Post('jobs/:jobId/requeue')
  requeueJob(@CurrentUser() user: JwtUser, @Param('jobId') jobId: string) {
    return this.biometricService.requeueJob(user.tenantId, user.sub, jobId);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin')
  @Post('jobs/bulk-requeue')
  bulkRequeueJobs(@CurrentUser() user: JwtUser, @Body() dto: BulkJobActionDto) {
    return this.biometricService.bulkRequeueJobs(user.tenantId, user.sub, dto.ids);
  }

  @Roles('employee', 'tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('jobs/:jobId')
  myJob(@CurrentUser() user: JwtUser, @Param('jobId') jobId: string) {
    return this.biometricService.getMyJob(user.sub, jobId);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('team/reviews')
  teamReviews(@CurrentUser() user: JwtUser, @Query() query: BiometricReviewsQueryDto) {
    return this.biometricService.getTeamReviews(user.tenantId, query);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('reviews/inbox')
  reviewInbox(@CurrentUser() user: JwtUser) {
    return this.biometricService.getReviewInbox(user.tenantId);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('employees/:employeeId/history')
  employeeHistory(
    @CurrentUser() user: JwtUser,
    @Param('employeeId') employeeId: string,
    @Query() query: BiometricHistoryQueryDto,
  ) {
    return this.biometricService.getEmployeeHistory(user.tenantId, employeeId, Number(query.limit ?? '50'));
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Post('verifications/:verificationId/review')
  reviewVerification(
    @CurrentUser() user: JwtUser,
    @Param('verificationId') verificationId: string,
    @Body() dto: ReviewBiometricVerificationDto,
  ) {
    return this.biometricService.reviewVerification(user, verificationId, dto);
  }
}
