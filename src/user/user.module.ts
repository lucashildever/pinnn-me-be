import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserEntity } from './entities/user.entity';

import { CredentialModule } from 'src/credential/credential.module';
import { CacheModule } from 'src/cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    CredentialModule,
    CacheModule,
  ],
  exports: [UserService, TypeOrmModule],
  providers: [UserService],
  controllers: [UserController],
})
export class UserModule {}
