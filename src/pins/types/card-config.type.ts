import { CardVariant } from '../enums/card-variant.enum';
import { CardIconConfig } from './card-icon-config';

export type CardConfig =
  | { variant: CardVariant.Image; src: string }
  | { variant: CardVariant.Link; icon: CardIconConfig; href: string };
