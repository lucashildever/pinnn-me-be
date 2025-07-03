import {
  IsEnum,
  IsUUID,
  Matches,
  IsString,
  MaxLength,
  MinLength,
  IsBoolean,
  IsNotEmpty,
} from 'class-validator';
import { TabType } from '../enums/tab-type.enum';
import { Status } from 'src/common/enums/status.enum';

export class CollectionTabDto {
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @IsEnum(TabType)
  @IsNotEmpty()
  type: TabType;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9A-Za-z_-]+$/, {
    message:
      'order must contain only alphanumeric characters, hyphens or underscores',
  })
  @MinLength(1)
  @MaxLength(10)
  order: string;

  @IsBoolean()
  isMain: boolean = false;

  @IsString()
  @MaxLength(1000)
  @Matches(
    /^(none|https?:\/\/.*|[\p{Emoji_Presentation}\p{Extended_Pictographic}])$/u,
    {
      message: 'Icon must be "none", a valid URL, or a single emoji',
    },
  )
  icon: string;

  @IsString()
  @MaxLength(15)
  @IsNotEmpty()
  content: string;

  @IsEnum(Status)
  status: Status = Status.ACTIVE;
}
