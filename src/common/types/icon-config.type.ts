import { PredefinedIcon } from '../enums/predefined-icon.enum';
import { IconType } from '../enums/icon-type.enum';

export type IconConfig =
  | { type: IconType.NONE }
  | { type: IconType.PREDEFINED; icon: PredefinedIcon }
  | { type: IconType.CUSTOM; url: string }
  | { type: IconType.EMOJI; unicode: string };
