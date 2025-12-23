import { IconConfigDto } from 'src/common/dto/icon-config.dto';

/**
 * Discriminated union type for history previews.
 * - 'icon': Collection icon (when sharing within same mural)
 * - 'image': Profile image URL (when sharing from different mural)
 * - 'none': No preview available
 */
export type HistoryPreview =
  | { type: 'icon'; icon: IconConfigDto }
  | { type: 'image'; url: string }
  | { type: 'none' };
