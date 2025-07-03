import configuration from 'config/configuration';
import { Module } from '@nestjs/common';
import { PinModule } from './pin/pin.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from './cache/cache.module';
import { MuralModule } from './mural/mural.module';
import { CommonModule } from './common/common.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from './database/database.module';
import { CollectionModule } from './collection/collection.module';
import { CredentialModule } from './credential/credential.module';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306', 10),
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: process.env.ENVIRONMENT?.toLowerCase() === 'development',
      namingStrategy: new SnakeNamingStrategy(),
    }),
    UserModule,
    MuralModule,
    CollectionModule,
    PinModule,
    AuthModule,
    DatabaseModule,
    CredentialModule,
    CacheModule,
    CommonModule,
  ],
})
export class AppModule {}
