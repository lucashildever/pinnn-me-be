import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';
import { CALL_TO_ACTION_TYPES } from '../../constants/call-to-action-types.constant';
import { CallToActionType } from 'src/murals/types/call-to-action.type';

export class CallToActionConfigDto {
  @IsEnum(CALL_TO_ACTION_TYPES)
  type: CallToActionType;

  @IsOptional()
  @IsUrl()
  link?: string;

  @IsOptional()
  @IsString()
  text?: string;
}
