export class ResourceMetaDto {
  sharedResourceId?: string;
  firstResourceId?: string;
  groupName?: string | null;
  history?: { sourceMuralId: string; order: number }[];
}
