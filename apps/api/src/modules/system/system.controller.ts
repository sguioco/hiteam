import { Body, Controller, Post, Headers, UnauthorizedException } from '@nestjs/common';
import { SystemService } from './system.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { GenerateTrialPromoCodesDto } from './dto/generate-trial-promo-codes.dto';
import { RegisterOrganizationDto } from '../auth/dto/register-organization.dto';

@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Post('tenants')
  async createTenant(
    @Headers('x-system-secret') secret: string,
    @Body() dto: CreateTenantDto,
  ) {
    if (!process.env.SYSTEM_SECRET || secret !== process.env.SYSTEM_SECRET) {
      throw new UnauthorizedException('Invalid system secret');
    }
    return this.systemService.createTenant(dto);
  }

  @Post('organizations')
  async createOrganization(
    @Headers('x-system-secret') secret: string,
    @Body() dto: RegisterOrganizationDto,
  ) {
    if (!process.env.SYSTEM_SECRET || secret !== process.env.SYSTEM_SECRET) {
      throw new UnauthorizedException('Invalid system secret');
    }

    return this.systemService.createOrganization(dto);
  }

  @Post('trial-promo-codes')
  async generateTrialPromoCodes(
    @Headers('x-system-secret') secret: string,
    @Body() dto: GenerateTrialPromoCodesDto,
  ) {
    if (!process.env.SYSTEM_SECRET || secret !== process.env.SYSTEM_SECRET) {
      throw new UnauthorizedException('Invalid system secret');
    }

    return this.systemService.generateTrialPromoCodes(dto);
  }
}
