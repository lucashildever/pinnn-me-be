import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MuralService } from './mural.service';
import { MuralController } from './mural.controller';
import { MuralEntity } from './entities/mural.entity';

import { CredentialModule } from 'src/credential/credential.module';
import { CollectionModule } from 'src/collection/collection.module';
import { CacheModule } from 'src/cache/cache.module';
import { UserModule } from 'src/user/user.module';
import { PinModule } from 'src/pin/pin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MuralEntity]),
    CredentialModule,
    CollectionModule,
    CacheModule,
    UserModule,
    PinModule,
  ],
  controllers: [MuralController],
  providers: [MuralService],
  exports: [MuralService, TypeOrmModule],
})
export class MuralModule {}
