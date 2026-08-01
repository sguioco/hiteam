import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssignLocationEmployeesDto } from './dto/assign-location-employees.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UpdateOrgSettingsDto } from './dto/update-org-settings.dto';
import { UpsertOrgSetupDto } from './dto/upsert-org-setup.dto';
import { OrgService } from './org.service';

@Controller('org')
export class OrgController {
  constructor(private readonly orgService: OrgService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('companies')
  companies(
    @CurrentUser() user: JwtUser,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.orgService.listCompanies(
      user.tenantId,
      includeArchived === 'true',
      user.sub,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('tenant_owner', 'operations_admin')
  @Post('companies')
  createCompany(@CurrentUser() user: JwtUser, @Body() dto: CreateCompanyDto) {
    return this.orgService.createCompany(user.tenantId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('tenant_owner', 'operations_admin', 'manager')
  @Patch('companies/:companyId')
  updateCompany(
    @CurrentUser() user: JwtUser,
    @Param('companyId') companyId: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.orgService.updateCompany(
      user.tenantId,
      user.sub,
      companyId,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('tenant_owner', 'operations_admin')
  @Delete('companies/:companyId')
  archiveCompany(
    @CurrentUser() user: JwtUser,
    @Param('companyId') companyId: string,
  ) {
    return this.orgService.archiveCompany(user.tenantId, companyId);
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
  locations(
    @CurrentUser() user: JwtUser,
    @Query('companyId') companyId?: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.orgService.listLocations(
      user.tenantId,
      companyId,
      includeArchived === 'true',
      user.sub,
    );
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
  @Patch('settings')
  updateSettings(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateOrgSettingsDto,
  ) {
    return this.orgService.updateSettings(user.tenantId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('tenant_owner', 'operations_admin', 'manager')
  @Post('locations')
  createLocation(@CurrentUser() user: JwtUser, @Body() dto: CreateLocationDto) {
    return this.orgService.createLocation(user.tenantId, user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('tenant_owner', 'operations_admin', 'manager')
  @Patch('locations/:locationId')
  updateLocation(
    @CurrentUser() user: JwtUser,
    @Param('locationId') locationId: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.orgService.updateLocation(
      user.tenantId,
      user.sub,
      locationId,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('tenant_owner', 'operations_admin')
  @Delete('locations/:locationId')
  archiveLocation(
    @CurrentUser() user: JwtUser,
    @Param('locationId') locationId: string,
  ) {
    return this.orgService.archiveLocation(user.tenantId, locationId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('tenant_owner', 'operations_admin', 'manager')
  @Post('locations/:locationId/employees')
  assignEmployees(
    @CurrentUser() user: JwtUser,
    @Param('locationId') locationId: string,
    @Body() dto: AssignLocationEmployeesDto,
  ) {
    return this.orgService.assignEmployeesToLocation(
      user.tenantId,
      user.sub,
      locationId,
      dto,
    );
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
