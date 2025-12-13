import {
  IsUUID,
  IsArray,
  IsString,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateVariantDto } from 'src/pins/dto/variant/create-variant.dto';

export class SharePinResourceDto {
  @IsUUID()
  sharedPinId: string;

  @IsString()
  sourceMuralId: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  additionalVariants?: CreateVariantDto[];
}
