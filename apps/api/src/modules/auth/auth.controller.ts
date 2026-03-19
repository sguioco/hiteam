import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AllowPendingAccess } from '../../common/decorators/allow-pending-access.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterOwnerDto } from './dto/register-owner.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register-owner')
  registerOwner(@Body() dto: RegisterOwnerDto) {
    return this.authService.registerOwner(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @AllowPendingAccess()
  @Get('me')
  me(@CurrentUser() user: JwtUser) {
    return this.authService.me(user.sub);
  }
}
