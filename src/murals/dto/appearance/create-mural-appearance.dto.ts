import { IsOptional, IsString, IsUrl, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MuralThemeConfig } from '../../types/mural-theme-config.type';

class ThemeConfigDto implements MuralThemeConfig {
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  accentColor?: string;

  @IsOptional()
  @IsString()
  fontFamily?: string;
}

export class CreateMuralAppearanceDto {
  @IsOptional()
  @IsUrl()
  profileImageUrl?: string;

  @IsOptional()
  @IsUrl()
  coverImageUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ThemeConfigDto)
  themeConfig?: ThemeConfigDto;
}
