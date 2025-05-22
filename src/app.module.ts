import { Module } from '@nestjs/common';

import configuration from 'config/configuration';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from './auth/auth.module';
import { MuralModule } from './mural/mural.module';
import { CollectionModule } from './collection/collection.module';
import { PinGroupPageModule } from './pin-group-page/pin-group-page.module';
import { UserModule } from './user/user.module';
import { DatabaseModule } from './database/database.module';

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
    }),
    MuralModule,
    CollectionModule,
    PinGroupPageModule,
    AuthModule,
    UserModule,
    DatabaseModule,
  ],
})
export class AppModule {}
