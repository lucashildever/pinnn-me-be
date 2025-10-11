import { PLAN_TYPES } from '../constants/plan-types.constant';

export type PlanType = (typeof PLAN_TYPES)[keyof typeof PLAN_TYPES];
