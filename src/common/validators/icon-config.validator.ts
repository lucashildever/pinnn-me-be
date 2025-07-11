import {
  IsIn,
  IsUrl,
  IsEnum,
  IsString,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';
import { PredefinedIcon } from 'src/common/enums/predefined-icon.enum';
import { IsEmoji } from '../../collection/validators/is-emoji.validator';

export class IconConfigValidator {
  @IsIn(['none', 'predefined', 'custom', 'emoji'])
  type: string;

  @ValidateIf((o) => o.type === 'predefined')
  @IsEnum(PredefinedIcon)
  icon?: PredefinedIcon;

  @ValidateIf((o) => o.type === 'custom')
  @IsUrl()
  url?: string;

  @ValidateIf((o) => o.type === 'emoji')
  @IsEmoji()
  @IsString()
  @IsNotEmpty()
  unicode?: string;
}
