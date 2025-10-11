import { STATUSES } from '../constants/statuses.constant';

export type Status = (typeof STATUSES)[keyof typeof STATUSES];
