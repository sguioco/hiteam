import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DiagnosticsTrendsQueryDto } from './dto/diagnostics-trends-query.dto';
import { UpdateDiagnosticsPolicyDto } from './dto/update-diagnostics-policy.dto';
import { DiagnosticsService } from './diagnostics.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('diagnostics')
export class DiagnosticsController {
  constructor(private readonly diagnosticsService: DiagnosticsService) {}

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('summary')
  summary(@CurrentUser() user: JwtUser) {
    return this.diagnosticsService.summary(user.tenantId);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('trends')
  trends(@CurrentUser() user: JwtUser, @Query() query: DiagnosticsTrendsQueryDto) {
    return this.diagnosticsService.trends(user.tenantId, query);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('policy')
  policy(@CurrentUser() user: JwtUser) {
    return this.diagnosticsService.getPolicy(user.tenantId);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin')
  @Post('policy')
  updatePolicy(@CurrentUser() user: JwtUser, @Body() dto: UpdateDiagnosticsPolicyDto) {
    return this.diagnosticsService.updatePolicy(user.tenantId, user.sub, dto);
  }
}
