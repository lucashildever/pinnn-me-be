import { PartialType } from '@nestjs/mapped-types';
import { CreateMuralAppearanceDto } from './create-mural-appearance.dto';

export class UpdateMuralAppearanceDto extends PartialType(
  CreateMuralAppearanceDto,
) {}
