import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { IntegrationsModule } from 'src/integrations/integrations.module';
import { CollectionsModule } from 'src/collections/collections.module';
import { CommonModule } from 'src/common/common.module';
import { CacheModule } from 'src/cache/cache.module';
import { PinsService } from './pins.service';
import { VariantEntity } from './entities/variant.entity';
import { PinEntity } from './entities/pin.entity';
import { PinsController } from './pins.controller';
import { SubscriptionsModule } from 'src/subscriptions/subscriptions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PinEntity, VariantEntity]),
    SubscriptionsModule,
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
