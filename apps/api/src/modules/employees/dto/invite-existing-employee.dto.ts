import { IsEmail } from 'class-validator';

export class InviteExistingEmployeeDto {
  @IsEmail()
  email!: string;
}
