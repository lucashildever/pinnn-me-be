import { MuralThemeConfig } from '../../types/mural-theme-config.type';

export class MuralAppearanceDto {
  id: string;
  profileImageUrl?: string;
  coverImageUrl?: string;
  themeConfig?: MuralThemeConfig;
}
