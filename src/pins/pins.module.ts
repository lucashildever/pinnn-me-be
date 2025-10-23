import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';

import { IntegrationsModule } from 'src/integrations/integrations.module';
import { CollectionsModule } from 'src/collections/collections.module';
import { CommonModule } from 'src/common/common.module';
import { CacheModule } from 'src/cache/cache.module';

import { PinsController } from './pins.controller';
import { PinsService } from './pins.service';

import { CardEntity } from './entities/card.entity';
import { PinEntity } from './entities/pin.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PinEntity, CardEntity]),
    IntegrationsModule,
    CollectionsModule,
    CommonModule,
    CacheModule,
  ],
  providers: [PinsService],
  controllers: [PinsController],
  exports: [PinsService, TypeOrmModule],
})
export class PinsModule {}
