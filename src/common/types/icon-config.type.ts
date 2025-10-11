import { AppIcon } from './icon.types';

export type IconConfig =
  | { type: 'none' }
  | { type: 'predefined'; icon: AppIcon }
  | { type: 'custom'; url: string }
  | { type: 'emoji'; unicode: string };
