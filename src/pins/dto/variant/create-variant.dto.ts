import { OmitType } from '@nestjs/mapped-types';
import { VariantDto } from './variant.dto';

export class CreateVariantDto extends OmitType(VariantDto, ['id']) {}
