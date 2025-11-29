import {
  IsUUID,
  IsArray,
  IsString,
  IsOptional,
  ArrayMaxSize,
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
  @ArrayMaxSize(2, {
    message: 'You can add at most 2 additional variants when sharing a pin',
  })
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  additionalVariants?: CreateVariantDto[];
}
