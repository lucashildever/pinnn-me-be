import {
  IsUUID,
  Matches,
  IsString,
  MinLength,
  MaxLength,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VariantConfigDto } from './variant-config.dto';

export class VariantDto {
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

  @ValidateNested()
  @Type(() => VariantConfigDto)
  config: VariantConfigDto;
}
