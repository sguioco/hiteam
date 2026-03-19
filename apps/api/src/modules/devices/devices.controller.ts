import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { DevicesService } from './devices.service';

@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DevicesController {
  constructor(
    private readonly devicesService: DevicesService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('me')
  async listMine(@CurrentUser() user: JwtUser) {
    const employee = await this.prisma.employee.findUniqueOrThrow({ where: { userId: user.sub } });
    return this.devicesService.listForEmployee(employee.id);
  }

  @Post('register')
  async register(@CurrentUser() user: JwtUser, @Body() dto: RegisterDeviceDto) {
    const employee = await this.prisma.employee.findUniqueOrThrow({ where: { userId: user.sub } });
    return this.devicesService.register(employee.id, dto);
  }
}
