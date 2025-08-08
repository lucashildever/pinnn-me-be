import { PartialType } from '@nestjs/mapped-types';
import { CallToActionDto } from './call-to-action.dto';

export class UpdateCallToActionDto extends PartialType(CallToActionDto) {}
