import { IconConfig } from 'src/common/types/icon-config.type';
import { CardVariant } from '../enums/card-variant.enum';

export type CardConfig =
  | { variant: CardVariant.LINK; href: string; iconConfig: IconConfig }
  | { variant: CardVariant.DOWNLOAD; iconConfig: IconConfig }
  | { variant: CardVariant.IMAGE; src: string }
  | { variant: CardVariant.INTEGRATION };
