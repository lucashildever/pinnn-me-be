import { OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class CreateUserResponseDto extends OmitType(CreateUserDto, [
  'password',
] as const) {
  id: string;
}
