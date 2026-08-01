import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString, MaxLength, MinLength } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AltegioPilotService } from './altegio-pilot.service';

class PilotAuthorizeDto { @IsString() @MinLength(1) @MaxLength(256) login!: string; @IsString() @MinLength(1) @MaxLength(512) password!: string; }
class PilotLocationsDto { @IsArray() @ArrayMinSize(1) @ArrayMaxSize(3) @IsString({ each: true }) locationIds!: string[]; }

@Controller('altegio/pilot')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('tenant_owner', 'hr_admin', 'operations_admin')
export class AltegioPilotController {
  constructor(private readonly pilot: AltegioPilotService) {}
  @Get() status(@CurrentUser() user: JwtUser) { return this.pilot.status(user.tenantId); }
  @Post('authorize') authorize(@CurrentUser() user: JwtUser, @Body() body: PilotAuthorizeDto) { return this.pilot.authorize(user.tenantId, user.sub, body.login, body.password); }
  @Post('locations') locations(@CurrentUser() user: JwtUser, @Body() body: PilotLocationsDto) { return this.pilot.selectLocations(user.tenantId, body.locationIds); }
  @Post('sync') sync(@CurrentUser() user: JwtUser) { return this.pilot.sync(user.tenantId); }
  @Delete('locations/:locationId') removeLocation(@CurrentUser() user: JwtUser, @Param('locationId') locationId: string) { return this.pilot.removeLocation(user.tenantId, locationId); }
  @Delete() disconnect(@CurrentUser() user: JwtUser) { return this.pilot.disconnect(user.tenantId); }
}
