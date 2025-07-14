import {
  IsIn,
  IsUrl,
  IsEnum,
  IsString,
  IsNotEmpty,
  ValidateIf,
} from 'class-validator';
import { PredefinedIcon } from 'src/common/enums/predefined-icon.enum';

export class CardIconConfigValidator {
  @IsIn(['custom', 'predefined'])
  type: string;

  @ValidateIf((o) => o.type === 'custom')
  @IsUrl()
  @IsString()
  @IsNotEmpty()
  src?: string;

  @ValidateIf((o) => o.type === 'predefined')
  @IsEnum(PredefinedIcon)
  icon?: PredefinedIcon;
}
