import {
  IsIn,
  IsUrl,
  IsEnum,
  IsString,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';
import { PredefinedIcon } from 'src/common/enums/predefined-icon.enum';
import { IsEmoji } from '../../collections/validators/is-emoji.validator';

export class IconConfigValidator {
  @IsIn(['none', 'predefined', 'custom', 'emoji'])
  type: string;

  @ValidateIf((o) => o.type === 'predefined')
  @IsEnum(PredefinedIcon)
  icon?: PredefinedIcon;

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
