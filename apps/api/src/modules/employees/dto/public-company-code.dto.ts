import { IsNotEmpty, IsString } from 'class-validator';

export class PublicCompanyCodeDto {
  @IsString()
  @IsNotEmpty()
  code!: string;
}
