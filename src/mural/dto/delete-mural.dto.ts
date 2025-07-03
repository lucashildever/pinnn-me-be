import { IsString, IsNotEmpty } from 'class-validator';

export class DeleteMuralDto {
  @IsString()
  @IsNotEmpty()
  password: string;
}
