import { PartialType } from '@nestjs/mapped-types';
import { VariantDto } from './variant.dto';

export class UpdateVariantDto extends PartialType(VariantDto) {}
