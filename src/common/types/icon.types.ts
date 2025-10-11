export const ICONS = {
  Tiktok: 'tiktok',
  Instagram: 'instagram',
  ArrowUpRight: 'arrowUpRight',
  Download: 'download',
  Options: 'options',
  Message: 'message',
  Pinterest: 'pinterest',
  Twitch: 'twitch',
  Link: 'link',
  File: 'file',
  Loading: 'loading',
  Youtube: 'youtube',
  X: 'x',
} as const;

export type AppIcon = (typeof ICONS)[keyof typeof ICONS];

export const ICON_CATEGORIES = {
  Motion: 'motion',
  Social: 'social',
  Action: 'actions',
  Navigation: 'navigation',
  Communication: 'communication',
  Documents: 'documents',
} as const;

export type IconCategoryType =
  (typeof ICON_CATEGORIES)[keyof typeof ICON_CATEGORIES];

export type IconType = 'simple' | 'lucide';

export interface IconMetadata {
  type: IconType;
  label: string;
  category: IconCategoryType;
  // Para ícones simple-icons, armazenamos os dados SVG
  svgPath?: string;
  slug?: string;
  // Para ícones lucide, apenas o nome
  lucideName?: string;
}
