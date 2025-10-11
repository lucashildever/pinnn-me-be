import { MuralDto } from 'src/murals/dto/mural.dto';
import { Role } from 'src/auth/types/role.type';

export class UserResponseDto {
  id: string;
  email: string;
  username: string;
  role: Role;
  murals?: MuralDto[];
}
