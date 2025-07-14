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
import { CardConfig } from 'src/pins/types/card-config.type';
import { CardConfigValidator } from 'src/pins/validators/card-config.validator';

export class CardDto {
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

  @IsString()
  @IsNotEmpty()
  caption: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CardConfigValidator)
  cardConfig: CardConfig;
}
