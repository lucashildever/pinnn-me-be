import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CollectionsController } from './collections.controller';
import { CollectionsService } from './collections.service';
import { CollectionEntity } from './entities/collection.entity';

import { CommonModule } from 'src/common/common.module';
import { CacheModule } from 'src/cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CollectionEntity]),
    CacheModule,
    CommonModule,
  ],
  providers: [CollectionsService],
  exports: [CollectionsService, TypeOrmModule],
  controllers: [CollectionsController],
})
export class CollectionsModule {}
