import { IsEmail } from 'class-validator';

export class PublicEmailLookupDto {
  @IsEmail()
  email!: string;
}
