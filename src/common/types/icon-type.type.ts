import { ICON_TYPES } from '../constants/icon-type.constant';

export type IconType = (typeof ICON_TYPES)[keyof typeof ICON_TYPES];
