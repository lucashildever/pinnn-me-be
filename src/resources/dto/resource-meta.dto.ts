export class ResourceMetaDto {
  sharedResourceId?: string;
  firstResourceId?: string;
  groupName?: string | null;
  inheritedPinsTotal?: number;
  history?: { sourceMuralId: string; order: number }[];
}
