import { PredefinedIcon } from 'src/common/enums/predefined-icon.enum';

export type CardIconConfig =
  | { type: 'custom'; src: string }
  | { type: 'predefined'; icon: PredefinedIcon };
