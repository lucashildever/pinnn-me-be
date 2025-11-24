import {
  IsUUID,
  Matches,
  IsArray,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsNotEmpty,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { VariantDto } from './variant/variant.dto';
import { Type } from 'class-transformer';

export class PinDto {
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9A-Za-z_-]+$/, {
    message:
      'order must contain only alphanumeric characters, hyphens or underscores',
  })
  @MinLength(1)
  @MaxLength(10)
  order: string;

  @IsArray()
  @IsNotEmpty()
  @ArrayMinSize(1, { message: 'At least one variant is required' })
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants: VariantDto[];
}
