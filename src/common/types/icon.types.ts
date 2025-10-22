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

export const ICON_CATEGORIES = [
  'motion',
  'social',
  'actions',
  'navigation',
  'communication',
  'documents',
] as const;

export type IconCategory = (typeof ICON_CATEGORIES)[number];

export type IconType = 'simple' | 'lucide';

export interface IconMetadata {
  type: IconType;
  label: string;
  category: IconCategory;
  svgPath?: string; // for simple-icons
  slug?: string; // for lucide
  lucideName?: string;
}
