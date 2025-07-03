import {
  IsEnum,
  IsUUID,
  IsString,
  IsNotEmpty,
  IsOptional,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CardType } from '../../enums/card-type.enum';

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
  caption: string;

  @IsEnum(CardType)
  variantType: CardType;

  @IsString()
  @IsOptional()
  link?: string;
}
