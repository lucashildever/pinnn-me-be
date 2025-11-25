import { PartialType, OmitType } from '@nestjs/mapped-types';
import { VariantDto } from './variant.dto';

export class UpdateVariantDto extends PartialType(
  OmitType(VariantDto, ['order']),
) {}
