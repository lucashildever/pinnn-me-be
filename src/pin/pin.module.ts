import { Module } from '@nestjs/common';

import { CacheModule } from 'src/cache/cache.module';
import { PinService } from './pin.service';
import { PinController } from './pin.controller';

import { TypeOrmModule } from '@nestjs/typeorm';
import { PinEntity } from './entities/pin.entity';
import { CardEntity } from './entities/card.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PinEntity, CardEntity]), CacheModule],
  providers: [PinService],
  controllers: [PinController],
  exports: [PinService, TypeOrmModule],
})
export class PinModule {}
