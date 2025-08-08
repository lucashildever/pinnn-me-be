import { IsIn, IsNotEmpty, IsString, IsUrl, ValidateIf } from 'class-validator';

export class CallToActionConfigValidator {
  @IsIn(['profile', 'banner'])
  type: string;

  @ValidateIf((o) => o.type === 'profile' || o.type === 'banner')
  @IsUrl()
  @IsNotEmpty()
  link?: string;

  @ValidateIf((o) => o.type === 'banner')
  @IsString()
  @IsNotEmpty()
  text?: string;
}
