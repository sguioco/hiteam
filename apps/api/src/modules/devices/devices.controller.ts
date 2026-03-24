import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { DevicesService } from './devices.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('devices')
export class DevicesController {
  constructor(
    private readonly devicesService: DevicesService,
    private readonly prisma: PrismaService,
  ) {}

  @Roles('employee', 'tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Get('me')
  async listMine(@CurrentUser() user: JwtUser) {
    const employee = await this.prisma.employee.findUniqueOrThrow({ where: { userId: user.sub } });
    return this.devicesService.listForEmployee(employee.id);
  }

  @Roles('employee', 'tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Post('register')
  async register(@CurrentUser() user: JwtUser, @Body() dto: RegisterDeviceDto) {
    const employee = await this.prisma.employee.findUniqueOrThrow({ where: { userId: user.sub } });
    return this.devicesService.register(employee.id, dto);
  }

  @Roles('tenant_owner', 'hr_admin', 'operations_admin', 'manager')
  @Delete('employees/:employeeId/:deviceId')
  async detachForEmployee(
    @CurrentUser() user: JwtUser,
    @Param('employeeId') employeeId: string,
    @Param('deviceId') deviceId: string,
  ) {
    return this.devicesService.detachForEmployee(user.tenantId, user.sub, employeeId, deviceId);
  }
}
