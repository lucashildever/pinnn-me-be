import { PLAN_STATUSES } from '../constants/plan-status.constant';

export type PlanStatus = (typeof PLAN_STATUSES)[keyof typeof PLAN_STATUSES];
