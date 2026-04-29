import { IsIn, IsString } from 'class-validator';

export class UpdateEmployeeWorkModeDto {
  @IsString()
  @IsIn(['STATIONARY', 'FIELD'])
  workMode!: 'STATIONARY' | 'FIELD';
}
