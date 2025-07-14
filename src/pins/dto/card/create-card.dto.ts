import { OmitType } from '@nestjs/mapped-types';
import { CardDto } from './card.dto';

export class CreateCardDto extends OmitType(CardDto, ['id']) {}
