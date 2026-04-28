import { IsBoolean } from "class-validator";

export class UpdateLeaderboardSettingsDto {
  @IsBoolean()
  hidePeersFromEmployees!: boolean;
}
