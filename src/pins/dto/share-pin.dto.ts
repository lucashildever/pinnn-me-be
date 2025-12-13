import {
  IsUUID,
  IsArray,
  IsString,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateVariantDto } from './variant/create-variant.dto';

export class SharePinDto {
  @IsUUID()
  sharedPinId: string;

  @IsString()
  sourceMuralId: string;

  @IsOptional()
  @IsString()
  order?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  additionalVariants?: CreateVariantDto[];
}
