import { IsNotEmpty, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { CallToActionConfigValidator } from '../../validators/call-to-action-config.validator';
import { CallToActionConfig } from '../../types/call-to-action-config.type';

import { DisplayElementDto } from 'src/common/dto/display-element.dto';

export class CallToActionDto extends DisplayElementDto {
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @ValidateNested()
  @Type(() => CallToActionConfigValidator)
  callToActionConfig: CallToActionConfig;
}
