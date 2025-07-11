import { CardVariant } from '../enums/card-variant.enum';
import { CardIconConfig } from './card-icon-config';

export type CardConfig =
  | { variant: CardVariant.IMAGE; src: string }
  | { variant: CardVariant.LINK; icon: CardIconConfig };
