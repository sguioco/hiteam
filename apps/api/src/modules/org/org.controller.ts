import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpsertOrgSetupDto } from './dto/upsert-org-setup.dto';
import { OrgService } from './org.service';

@Controller('org')
export class OrgController {
  constructor(private readonly orgService: OrgService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('companies')
  companies(@CurrentUser() user: JwtUser) {
    return this.orgService.listCompanies(user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('departments')
  departments(@CurrentUser() user: JwtUser) {
    return this.orgService.listDepartments(user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('locations')
  locations(@CurrentUser() user: JwtUser) {
    return this.orgService.listLocations(user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('positions')
  positions(@CurrentUser() user: JwtUser) {
    return this.orgService.listPositions(user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('setup')
  setup(@CurrentUser() user: JwtUser) {
    return this.orgService.getSetup(user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('tenant_owner', 'operations_admin')
  @Post('locations')
  createLocation(@CurrentUser() user: JwtUser, @Body() dto: CreateLocationDto) {
    return this.orgService.createLocation(user.tenantId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('tenant_owner', 'operations_admin')
  @Post('setup')
  upsertSetup(@CurrentUser() user: JwtUser, @Body() dto: UpsertOrgSetupDto) {
    return this.orgService.upsertSetup(user.tenantId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('tenant_owner', 'operations_admin')
  @Delete('setup')
  deleteSetup(@CurrentUser() user: JwtUser) {
    return this.orgService.deleteSetup(user.tenantId);
  }
}
