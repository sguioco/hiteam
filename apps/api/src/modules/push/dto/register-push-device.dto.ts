import { IsIn, IsString, MinLength } from 'class-validator';

export class RegisterPushDeviceDto {
  @IsString()
  @MinLength(10)
  token!: string;

  @IsIn(['IOS', 'ANDROID'])
  platform!: 'IOS' | 'ANDROID';
}
