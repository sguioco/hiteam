import { IsBoolean, IsInt, Max, Min } from 'class-validator';

export class UpdateTaskAutomationPolicyDto {
  @IsInt()
  @Min(0)
  @Max(30)
  reminderLeadDays!: number;

  @IsInt()
  @Min(1)
  @Max(168)
  reminderRepeatHours!: number;

  @IsInt()
  @Min(0)
  @Max(30)
  escalationDelayDays!: number;

  @IsBoolean()
  escalateToManager!: boolean;

  @IsBoolean()
  notifyAssignee!: boolean;

  @IsBoolean()
  sendChatMessages!: boolean;
}
