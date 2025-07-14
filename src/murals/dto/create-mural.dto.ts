import { IsNotEmpty, IsUUID } from 'class-validator';
import { MuralDto } from './mural.dto';

export class CreateMuralDto extends MuralDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;
}
