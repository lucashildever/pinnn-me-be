import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class CreateMuralDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(10)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(20)
  displayName: string;

  @IsString()
  @MaxLength(500)
  description: string;
}
