import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CollectionController } from './collection.controller';
import { CollectionService } from './collection.service';
import { CollectionEntity } from './entities/collection.entity';

import { CacheModule } from 'src/cache/cache.module';

@Module({
  imports: [TypeOrmModule.forFeature([CollectionEntity]), CacheModule],
  providers: [CollectionService],
  exports: [CollectionService, TypeOrmModule],
  controllers: [CollectionController],
})
export class CollectionModule {}
