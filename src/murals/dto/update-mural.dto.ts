import { PartialType } from '@nestjs/mapped-types';
import { MuralDto } from './mural.dto';

export class UpdateMuralDto extends PartialType(MuralDto) {}
