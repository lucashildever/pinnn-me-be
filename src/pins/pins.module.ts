import { Module } from '@nestjs/common';

import { CollectionsModule } from 'src/collections/collections.module';
import { CacheModule } from 'src/cache/cache.module';

import { PinsController } from './pins.controller';
import { PinsService } from './pins.service';

import { TypeOrmModule } from '@nestjs/typeorm';
import { CardEntity } from './entities/card.entity';
import { PinEntity } from './entities/pin.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PinEntity, CardEntity]),
    CollectionsModule,
    CacheModule,
  ],
  providers: [PinsService],
  controllers: [PinsController],
  exports: [PinsService, TypeOrmModule],
})
export class PinsModule {}
