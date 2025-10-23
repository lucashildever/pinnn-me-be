import { Injectable, Logger } from '@nestjs/common';

import {
  IntegrationData,
  IntegrationProvider,
} from '../interfaces/integration-provider.interface';

@Injectable()
export class SpotifyIntegrationProvider implements IntegrationProvider {
  private readonly logger = new Logger(SpotifyIntegrationProvider.name);
  private readonly OEMBED_ENDPOINT = 'https://open.spotify.com/oembed';
  private readonly TIMEOUT_MS = 5000;

  async fetchIntegration(url: string): Promise<IntegrationData> {
    try {
      this.logger.debug(`Fetching Spotify oEmbed for URL: ${url}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      const oembedUrl = new URL(this.OEMBED_ENDPOINT);
      oembedUrl.searchParams.append('url', url);
      oembedUrl.searchParams.append('format', 'json');

      const response = await fetch(oembedUrl.toString(), {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `Spotify oEmbed API returned status ${response.status}: ${response.statusText}`,
        );
      }

      const data = await response.json();

      this.logger.debug(`Successfully fetched Spotify oEmbed data`);

      return {
        html: data.html,
        title: data.title,
        thumbnailUrl: data.thumbnail_url,
        authorName: data.author_name,
        width: data.width,
        height: data.height,
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        this.logger.error(
          `Spotify oEmbed request timeout after ${this.TIMEOUT_MS}ms`,
        );
        throw new Error('Spotify integration request timeout');
      }

      this.logger.error(`Failed to fetch Spotify oEmbed: ${error.message}`);
      throw new Error(`Failed to fetch Spotify integration: ${error.message}`);
    }
  }
}
