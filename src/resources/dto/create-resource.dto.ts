import {
  IsArray,
  IsString,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { CreatePinDto } from 'src/pins/dto/create-pin.dto';

export class CreateResourceDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePinDto)
  @IsNotEmpty()
  pins: CreatePinDto[];

  @IsOptional()
  @IsString()
  sharedResourceId?: string;

  @IsOptional()
  @IsString()
  sourceMuralId?: string;

  @IsOptional()
  @IsString()
  groupName?: string;
}
