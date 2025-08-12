import {
  IsEmail,
  IsArray,
  IsString,
  MaxLength,
  MinLength,
  IsNotEmpty,
  ValidateNested,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

import { Role } from 'src/auth/enums/role.enum';

import { MuralDto } from 'src/murals/dto/mural.dto';

export class UserResponseDto {
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(30, { message: 'Username must be at most 30 characters' })
  username: string;

  @IsEnum(Role, { message: 'role must be one of: user, admin, super_admin' })
  role: Role;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MuralDto)
  murals?: MuralDto[];
}
