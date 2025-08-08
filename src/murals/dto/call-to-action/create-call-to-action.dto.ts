import { OmitType } from '@nestjs/mapped-types';
import { CallToActionDto } from './call-to-action.dto';

export class CreateCallToActionDto extends OmitType(CallToActionDto, ['id']) {}
