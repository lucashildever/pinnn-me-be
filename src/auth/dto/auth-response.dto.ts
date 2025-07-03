import {
  IsJWT,
  IsUUID,
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AuthResponseDto {
  @IsJWT()
  @IsNotEmpty()
  access_token: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => AuthenticatedProfileDto)
  user: AuthenticatedProfileDto;
}

export class AuthenticatedProfileDto {
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(30, { message: 'Username must be at most 30 characters' })
  username: string;
}
