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
import { Status } from 'src/common/enums/status.enum';
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

  @IsEnum(Status)
  status: Status = Status.ACTIVE;

  @IsBoolean()
  isMain: boolean = false;

  @ValidateNested()
  @Type(() => DisplayElementDto)
  displayElement: DisplayElementDto;
}
