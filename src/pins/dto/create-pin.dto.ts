import {
  IsArray,
  IsString,
  IsOptional,
  ArrayMinSize,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCardDto } from './card/create-card.dto';

export class CreatePinDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  description: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one card is required' })
  @ValidateNested({ each: true })
  @Type(() => CreateCardDto)
  cards: CreateCardDto[];
}
