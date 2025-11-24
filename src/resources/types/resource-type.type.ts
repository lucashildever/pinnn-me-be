import { ResourceTypes } from '../constants/resource-types.constant';

export type ResourceType = (typeof ResourceTypes)[keyof typeof ResourceTypes];
