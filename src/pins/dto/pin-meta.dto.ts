export class PinMetaDto {
  sharedPinId?: string;
  firstPinId?: string;
  history?: { sourceMuralId: string; order: number }[];
}
