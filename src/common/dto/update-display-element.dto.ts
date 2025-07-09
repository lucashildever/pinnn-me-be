import { PartialType } from '@nestjs/mapped-types';
import { DisplayElementDto } from './display-element.dto';

export class UpdateDisplayElementDto extends PartialType(DisplayElementDto) {}
