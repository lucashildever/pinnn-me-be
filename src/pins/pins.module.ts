import { Module } from '@nestjs/common';

import { CacheModule } from 'src/cache/cache.module';
import { PinsService } from './pins.service';
import { PinsController } from './pins.controller';

import { TypeOrmModule } from '@nestjs/typeorm';
import { PinEntity } from './entities/pin.entity';
import { CardEntity } from './entities/card.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PinEntity, CardEntity]), CacheModule],
  providers: [PinsService],
  controllers: [PinsController],
  exports: [PinsService, TypeOrmModule],
})
export class PinsModule {}
