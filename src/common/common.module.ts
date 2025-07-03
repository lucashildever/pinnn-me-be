import { Global, Module } from '@nestjs/common';
import { FractionalIndexingService } from './services/fractional-indexing.service';

@Global()
@Module({
  providers: [FractionalIndexingService],
  exports: [FractionalIndexingService],
})
export class CommonModule {}
