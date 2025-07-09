import { PredefinedIcon } from '../enums/predefined-icon.enum';

export type IconConfig =
  | { type: 'none' }
  | { type: 'predefined'; icon: PredefinedIcon }
  | { type: 'custom'; url: string }
  | { type: 'emoji'; unicode: string };
