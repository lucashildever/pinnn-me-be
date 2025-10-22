import { SUPPORTED_PLATFORMS } from '../constants/supported-platforms.constant';

export type IntegrationPlatform = (typeof SUPPORTED_PLATFORMS)[number];
