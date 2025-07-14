import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { MuralDto } from './mural.dto';
import { Type } from 'class-transformer';

export class UpdateMuralResponseDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @ValidateNested()
  @Type(() => MuralDto)
  updatedMural: MuralDto;
}
