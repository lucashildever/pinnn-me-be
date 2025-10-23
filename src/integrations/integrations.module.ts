import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { SpotifyIntegrationProvider } from './providers/spotify-integration.provider';

@Module({
  providers: [IntegrationsService, SpotifyIntegrationProvider],
  exports: [IntegrationsService, SpotifyIntegrationProvider],
})
export class IntegrationsModule {}
