import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';
import { CallToActionType } from '../../enums/call-to-action-type.enum';

export class CallToActionConfigDto {
  @IsEnum(CallToActionType)
  type: CallToActionType;

  @IsOptional()
  @IsUrl()
  link?: string;

  @IsOptional()
  @IsString()
  text?: string;
}
