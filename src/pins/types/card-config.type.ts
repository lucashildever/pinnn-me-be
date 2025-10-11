import { IconConfig } from 'src/common/types/icon-config.type';

export type CardConfig =
  | { variant: 'link'; href: string; iconConfig: IconConfig }
  | { variant: 'download'; iconConfig: IconConfig }
  | { variant: 'image'; src: string }
  | { variant: 'integration' };
