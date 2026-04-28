import { Body, Controller, Get, Patch, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import type { JwtUser } from "../../common/interfaces/jwt-user.interface";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UpdateLeaderboardSettingsDto } from "./dto/update-leaderboard-settings.dto";
import { LeaderboardService } from "./leaderboard.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("leaderboard")
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Roles("employee", "tenant_owner", "hr_admin", "operations_admin", "manager")
  @Get("overview")
  overview(@CurrentUser() user: JwtUser, @Query("month") month?: string) {
    return this.leaderboardService.getOverview(user.sub, month);
  }

  @Roles("tenant_owner", "hr_admin", "operations_admin", "manager")
  @Patch("settings")
  updateSettings(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateLeaderboardSettingsDto,
  ) {
    return this.leaderboardService.updateSettings(user.sub, dto);
  }
}
