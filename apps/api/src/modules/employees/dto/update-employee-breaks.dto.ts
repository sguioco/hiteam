import { IsBoolean } from 'class-validator';

export class UpdateEmployeeBreaksDto {
  @IsBoolean()
  breaksEnabled!: boolean;
}
