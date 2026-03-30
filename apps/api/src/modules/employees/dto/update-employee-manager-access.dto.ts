import { IsBoolean } from 'class-validator';

export class UpdateEmployeeManagerAccessDto {
  @IsBoolean()
  grantManagerAccess!: boolean;
}
