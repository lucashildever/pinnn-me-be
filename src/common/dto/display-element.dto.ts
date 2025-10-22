import {
  IsString,
  MaxLength,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { IconConfigDto } from './icon-config.dto';

export class DisplayElementDto {
  @MaxLength(15)
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => IconConfigDto)
  iconConfig: IconConfigDto;
}
