import { CALL_TO_ACTION_TYPES } from '../constants/call-to-action-types.constant';

export type CallToActionType =
  (typeof CALL_TO_ACTION_TYPES)[keyof typeof CALL_TO_ACTION_TYPES];
