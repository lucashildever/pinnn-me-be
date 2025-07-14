import {
  IsEmail,
  IsArray,
  IsString,
  MaxLength,
  MinLength,
  IsNotEmpty,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { MuralDto } from 'src/murals/dto/mural.dto';
import { Type } from 'class-transformer';

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MuralDto)
  murals?: MuralDto[];
}
