import { CARD_VARIANTS } from '../constants/card-variant.constant';

export type CardVariant = (typeof CARD_VARIANTS)[keyof typeof CARD_VARIANTS];
