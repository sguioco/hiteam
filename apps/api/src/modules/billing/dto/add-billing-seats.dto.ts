import { IsInt, Max, Min } from 'class-validator';

export class AddBillingSeatsDto {
  @IsInt()
  @Min(1)
  @Max(500)
  seats!: number;
}
