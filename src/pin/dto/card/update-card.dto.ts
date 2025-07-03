import { IsNotEmpty, IsUUID } from 'class-validator';
import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CardDto } from './card.dto';

export class UpdateCardDto extends PartialType(
  OmitType(CardDto, ['id', 'order']),
) {
  @IsNotEmpty()
  @IsUUID()
  id: string;
}
