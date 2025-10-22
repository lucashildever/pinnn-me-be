import { IsUrl, IsNotEmpty, IsIn } from 'class-validator';
import { SUPPORTED_PLATFORMS } from 'src/pins/constants/supported-platforms.constant';
import { IsPlatformUrl } from 'src/pins/validators/is-platform-url.validator';

export class EmbedConfigDto {
  @IsIn(SUPPORTED_PLATFORMS)
  @IsNotEmpty()
  platform: string;

  @IsUrl()
  @IsNotEmpty()
  @IsPlatformUrl()
  url: string;
}
