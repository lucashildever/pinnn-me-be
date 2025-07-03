import { IsEmail, IsNotEmpty } from 'class-validator';

export class ValidateEmailDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
