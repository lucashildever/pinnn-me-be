import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';

import { MuralsController } from './murals.controller';
import { MuralsService } from './murals.service';
import { MuralEntity } from './entities/mural.entity';

import { CallToActionEntity } from './entities/call-to-action.entity';
import { CredentialsModule } from 'src/credentials/credentials.module';
import { CollectionsModule } from 'src/collections/collections.module';
import { CommonModule } from 'src/common/common.module';
import { CacheModule } from 'src/cache/cache.module';
import { UsersModule } from 'src/users/users.module';
import { PinsModule } from 'src/pins/pins.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MuralEntity, CallToActionEntity]),
    CredentialsModule,
    CollectionsModule,
    CommonModule,
    CacheModule,
    UsersModule,
    PinsModule,
  ],
  controllers: [MuralsController],
  providers: [MuralsService],
  exports: [MuralsService, TypeOrmModule],
})
export class MuralsModule {}
