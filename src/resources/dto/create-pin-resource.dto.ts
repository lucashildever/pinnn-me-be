import {
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateVariantDto } from 'src/pins/dto/variant/create-variant.dto';

export class CreatePinResourceDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one variant is required' })
  @ArrayMaxSize(4, { message: 'A pin resource can have at most 4 variants' })
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants: CreateVariantDto[];
}
