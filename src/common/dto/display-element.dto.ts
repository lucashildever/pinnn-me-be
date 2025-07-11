import {
  IsString,
  MaxLength,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IconConfig } from 'src/common/types/icon-config.type';
import { IconConfigValidator } from 'src/common/validators/icon-config.validator';

export class DisplayElementDto {
  @MaxLength(15)
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => IconConfigValidator)
  iconConfig: IconConfig;
}
