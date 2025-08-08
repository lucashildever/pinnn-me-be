import { Global, Module } from '@nestjs/common';
import { FractionalIndexingService } from './services/fractional-indexing.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisplayElementEntity } from './entities/display-element.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DisplayElementEntity])],
  providers: [FractionalIndexingService],
  exports: [FractionalIndexingService, TypeOrmModule],
})
export class CommonModule {}
