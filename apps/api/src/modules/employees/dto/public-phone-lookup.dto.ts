import { IsString } from 'class-validator';

export class PublicPhoneLookupDto {
  @IsString()
  phone!: string;
}
