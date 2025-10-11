import {
  IsEnum,
  IsUUID,
  Matches,
  IsString,
  MaxLength,
  MinLength,
  IsBoolean,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { DisplayElementDto } from '../../common/dto/display-element.dto';

import { STATUSES } from 'src/common/constants/statuses.constant';
import { Status } from 'src/common/types/status.type';

import { Type } from 'class-transformer';

export class CollectionDto {
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

  @IsEnum(STATUSES)
  status: Status = 'active';

  @IsBoolean()
  isMain: boolean = false;

  @ValidateNested()
  @Type(() => DisplayElementDto)
  displayElement: DisplayElementDto;
}
