import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MuralsService } from './murals.service';
import { MuralsController } from './murals.controller';
import { MuralEntity } from './entities/mural.entity';

import { CredentialsModule } from 'src/credentials/credentials.module';
import { CollectionsModule } from 'src/collections/collections.module';
import { CacheModule } from 'src/cache/cache.module';
import { UsersModule } from 'src/users/users.module';
import { PinsModule } from 'src/pins/pins.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MuralEntity]),
    CredentialsModule,
    CollectionsModule,
    CacheModule,
    UsersModule,
    PinsModule,
  ],
  controllers: [MuralsController],
  providers: [MuralsService],
  exports: [MuralsService, TypeOrmModule],
})
export class MuralsModule {}
