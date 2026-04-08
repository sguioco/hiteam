import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AllowPendingAccess } from '../../common/decorators/allow-pending-access.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterOwnerDto } from './dto/register-owner.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { EmployeesService } from '../employees/employees.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrgService } from '../org/org.service';

const ADMIN_ROLES = ['tenant_owner', 'hr_admin', 'operations_admin', 'manager'] as const;

function isEmployeeOnlyRole(roleCodes: string[]) {
  return !roleCodes.some((role) => ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]));
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly employeesService: EmployeesService,
    private readonly notificationsService: NotificationsService,
    private readonly orgService: OrgService,
  ) {}

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

  @UseGuards(JwtAuthGuard)
  @AllowPendingAccess()
  @Get('bootstrap')
  async bootstrap(@CurrentUser() user: JwtUser) {
    const [unreadCountResult, notificationItemsResult] = await Promise.allSettled([
      this.notificationsService.unreadCount(user.sub),
      this.notificationsService.listMine(user.sub),
    ]);

    const notifications =
      unreadCountResult.status === 'rejected' &&
      notificationItemsResult.status === 'rejected'
        ? null
        : {
            unreadCount:
              unreadCountResult.status === 'fulfilled'
                ? unreadCountResult.value.unreadCount
                : 0,
            notificationItems:
              notificationItemsResult.status === 'fulfilled'
                ? notificationItemsResult.value
                : [],
          };

    if (isEmployeeOnlyRole(user.roleCodes)) {
      try {
        const profile = await this.employeesService.getMe(user);

        return {
          header: {
            employeeCount: 0,
            organization: profile?.company?.name
              ? {
                  company: {
                    name: profile.company.name,
                    logoUrl: profile.company.logoUrl ?? null,
                  },
                  configured: true,
                }
              : null,
            accountProfile: profile,
          },
          notifications,
        };
      } catch {
        return {
          header: null,
          notifications,
        };
      }
    }

    const [employeeStatsResult, organizationResult, profileResult] =
      await Promise.allSettled([
        this.employeesService.stats(user.tenantId, {}),
        this.orgService.getSetup(user.tenantId),
        this.employeesService.getMe(user),
      ]);

    const accountProfile =
      profileResult.status === 'fulfilled' ? profileResult.value : null;
    const organization =
      organizationResult.status === 'fulfilled'
        ? organizationResult.value
        : accountProfile?.company?.name
          ? {
              company: {
                name: accountProfile.company.name,
                logoUrl: accountProfile.company.logoUrl ?? null,
              },
              configured: true,
            }
          : null;

    return {
      header:
        employeeStatsResult.status === 'rejected' &&
        organizationResult.status === 'rejected' &&
        profileResult.status === 'rejected'
          ? null
          : {
              employeeCount:
                employeeStatsResult.status === 'fulfilled'
                  ? employeeStatsResult.value.total
                  : 0,
              organization,
              accountProfile,
            },
      notifications,
    };
  }
}
