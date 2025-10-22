import { IsIn, IsNotEmpty, IsUrl, ValidateIf } from 'class-validator';
import { AppIcon } from '../types/icon.types';

export class IconConfigDto {
  @IsIn(['none', 'predefined', 'custom', 'emoji'])
  @IsNotEmpty()
  type: string;

  @ValidateIf((o) => o.type === 'predefined')
  @IsNotEmpty()
  icon?: AppIcon;

  @ValidateIf((o) => o.type === 'custom')
  @IsUrl()
  @IsNotEmpty()
  url?: string;

  @ValidateIf((o) => o.type === 'emoji')
  @IsNotEmpty()
  unicode?: string;
}
