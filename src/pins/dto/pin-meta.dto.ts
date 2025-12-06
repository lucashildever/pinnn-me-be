export class PinMetaDto {
  sharedPinId?: string;
  firstPinId?: string;
  inheritedVariantsTotal?: number;
  history?: { sourceMuralId: string; order: number }[];
}
