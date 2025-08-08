import { CallToActionType } from '../enums/call-to-action-type.enum';

export type CallToActionConfig =
  | { type: CallToActionType.PROFILE; link: string }
  | { type: CallToActionType.BANNER; text: string; link: string };
