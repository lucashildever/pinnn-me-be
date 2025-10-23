import { Injectable, Logger } from '@nestjs/common';
import { SpotifyIntegrationProvider } from './providers/spotify-integration.provider';
import {
  IntegrationProvider,
  IntegrationData,
} from './interfaces/integration-provider.interface';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(private readonly spotifyProvider: SpotifyIntegrationProvider) {}

  async fetchIntegration(
    platform: string,
    url: string,
  ): Promise<IntegrationData> {
    this.logger.debug(`Fetching integration for platform: ${platform}`);

    const provider = this.getProvider(platform);
    return await provider.fetchIntegration(url);
  }

  private getProvider(platform: string): IntegrationProvider {
    switch (platform) {
      case 'spotify':
        return this.spotifyProvider;
      // Add later more platforms here later

      default:
        throw new Error(`Unsupported integration platform: ${platform}`);
    }
  }

  isPlatformSupported(platform: string): boolean {
    const supportedPlatforms = ['spotify']; // Add later more platforms here later
    return supportedPlatforms.includes(platform);
  }
}
