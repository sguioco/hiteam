import { IsIn, IsOptional } from 'class-validator';

export class UpdateMyPreferencesDto {
  @IsOptional()
  @IsIn(['blue', 'green', 'red', 'black'])
  bannerTheme?: 'blue' | 'green' | 'red' | 'black';
}
