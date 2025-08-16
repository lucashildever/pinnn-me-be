import { MuralDto } from 'src/murals/dto/mural.dto';
import { Role } from 'src/auth/enums/role.enum';

export class UserResponseDto {
  id: string;
  email: string;
  username: string;
  role: Role;
  murals?: MuralDto[];
}
