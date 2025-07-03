import { Controller, Get } from '@nestjs/common';
import { CacheService } from './cache.service';

@Controller('cache')
export class CacheController {
  constructor(private readonly cacheService: CacheService) {}

  @Get('health')
  async checkHealth() {
    try {
      await this.cacheService.set('health', 'ok');
      const result = await this.cacheService.get('health');
      return { status: 'ok', result };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
}
