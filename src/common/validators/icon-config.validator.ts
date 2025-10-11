import {
  IsIn,
  IsUrl,
  IsEnum,
  IsString,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';
import { AppIcon, ICONS } from '../types/icon.types';
import { IsEmoji } from '../../collections/validators/is-emoji.validator';

export class IconConfigValidator {
  @IsIn(['none', 'predefined', 'custom', 'emoji'])
  type: string;

  @ValidateIf((o) => o.type === 'predefined')
  @IsEnum(ICONS)
  icon?: AppIcon;

  @ValidateIf((o) => o.type === 'custom')
  @IsUrl()
  @IsString()
  @IsNotEmpty()
  url?: string;

  @ValidateIf((o) => o.type === 'emoji')
  @IsString()
  @IsNotEmpty()
  @IsEmoji()
  unicode?: string;
}
