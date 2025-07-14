import { OmitType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsUUID, IsDate } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class CreateUserResponseDto extends OmitType(CreateUserDto, [
  'password',
] as const) {
  @IsUUID()
  @IsNotEmpty()
  id: string;
}
