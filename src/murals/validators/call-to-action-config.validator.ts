import {
  IsIn,
  IsNotEmpty,
  IsUrl,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FormConfigDto } from '../dto/call-to-action/form-config.dto';

export class CallToActionConfigValidator {
  @IsIn(['profile', 'banner', 'form'])
  type: string;

  @ValidateIf((o) => o.type === 'profile' || o.type === 'banner')
  @IsUrl()
  @IsNotEmpty()
  link?: string;

  @ValidateIf((o) => o.type === 'banner')
  @IsString()
  @IsNotEmpty()
  text?: string;

  @ValidateIf((o) => o.type === 'form')
  @ValidateNested()
  @Type(() => FormConfigDto)
  formConfig?: FormConfigDto;
}
