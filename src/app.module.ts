import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import configuration from 'config/configuration';

import { PinsModule } from './pins/pins.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PlansModule } from './plans/plans.module';
import { CacheModule } from './cache/cache.module';
import { MuralsModule } from './murals/murals.module';
import { CommonModule } from './common/common.module';
import { PaymentsModule } from './payments/payments.module';
import { DatabaseModule } from './database/database.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { BillingsModule } from './billings/billings.module';
import { CollectionsModule } from './collections/collections.module';
import { CredentialsModule } from './credentials/credentials.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
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
      synchronize: process.env.NODE_ENV?.toLowerCase() === 'development',
      //logging: process.env.NODE_ENV === 'development',
      namingStrategy: new SnakeNamingStrategy(),
    }),
    UsersModule,
    MuralsModule,
    CollectionsModule,
    PinsModule,
    AuthModule,
    DatabaseModule,
    CredentialsModule,
    CacheModule,
    CommonModule,
    PaymentsModule,
    SubscriptionsModule,
    PlansModule,
    WebhooksModule,
    BillingsModule,
  ],
})
export class AppModule {}
