import { IsBoolean, IsInt, Min } from 'class-validator';

export class UpdateDiagnosticsPolicyDto {
  @IsInt()
  @Min(1)
  exportQueueWarningMinutes!: number;

  @IsInt()
  @Min(1)
  exportQueueCriticalMinutes!: number;

  @IsInt()
  @Min(1)
  biometricQueueWarningMinutes!: number;

  @IsInt()
  @Min(1)
  biometricQueueCriticalMinutes!: number;

  @IsInt()
  @Min(0)
  exportFailureWarningCount24h!: number;

  @IsInt()
  @Min(0)
  biometricFailureWarningCount24h!: number;

  @IsInt()
  @Min(0)
  pushFailureCriticalCount24h!: number;

  @IsInt()
  @Min(0)
  pushReceiptErrorCriticalCount!: number;

  @IsInt()
  @Min(0)
  criticalAnomaliesCriticalCount!: number;

  @IsInt()
  @Min(0)
  pendingBiometricReviewWarningCount!: number;

  @IsInt()
  @Min(15)
  repeatIntervalMinutes!: number;

  @IsBoolean()
  notifyTenantOwner!: boolean;

  @IsBoolean()
  notifyHrAdmin!: boolean;

  @IsBoolean()
  notifyOperationsAdmin!: boolean;

  @IsBoolean()
  notifyManagers!: boolean;
}
