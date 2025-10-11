import { MURAL_PLANS } from '../constants/mural-plan.constant';

export type MuralPlan = (typeof MURAL_PLANS)[keyof typeof MURAL_PLANS];
