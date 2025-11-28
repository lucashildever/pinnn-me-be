import {
  IsArray,
  IsString,
  IsOptional,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateVariantDto } from './variant/create-variant.dto';

export class CreatePinDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one variant is required' })
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants: CreateVariantDto[];

  @IsOptional()
  @IsString()
  sharedPinId?: string;

  @IsOptional()
  @IsString()
  sourceMuralId?: string;
}
