import {
  IsUUID,
  Matches,
  IsArray,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsNotEmpty,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { CardDto } from './card/card.dto';
import { Type } from 'class-transformer';

export class PinDto {
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
  @MinLength(4)
  @IsNotEmpty()
  @IsOptional()
  description: string;

  @IsArray()
  @IsNotEmpty()
  @ArrayMinSize(1, { message: 'At least one card is required' })
  @ValidateNested({ each: true })
  @Type(() => CardDto)
  cards: CardDto[];
}
