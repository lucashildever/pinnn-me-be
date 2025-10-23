export interface IntegrationData {
  html: string;
  title?: string;
  thumbnailUrl?: string;
  authorName?: string;
  width?: number;
  height?: number;
}

export interface IntegrationProvider {
  fetchIntegration(url: string): Promise<IntegrationData>;
}
