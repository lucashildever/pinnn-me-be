import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResourcesService } from './resources.service';
import { ResourcesController } from './resources.controller';
import { ResourceEntity } from './entities/resource.entity';
import { PinsModule } from 'src/pins/pins.module';
import { CommonModule } from 'src/common/common.module';
import { CollectionsModule } from 'src/collections/collections.module';
import { SubscriptionsModule } from 'src/subscriptions/subscriptions.module';
import { PlansModule } from 'src/plans/plans.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ResourceEntity]),
    PinsModule,
    CommonModule,
    CollectionsModule,
    SubscriptionsModule,
    PlansModule,
  ],
  controllers: [ResourcesController],
  providers: [ResourcesService],
  exports: [ResourcesService],
})
export class ResourcesModule {}
