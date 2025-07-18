import configuration from 'config/configuration';
import { Module } from '@nestjs/common';
import { PinsModule } from './pins/pins.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from './cache/cache.module';
import { MuralsModule } from './murals/murals.module';
import { CommonModule } from './common/common.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from './database/database.module';
import { CollectionsModule } from './collections/collections.module';
import { CredentialsModule } from './credentials/credentials.module';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { PaymentModule } from './payment/payment.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { PlansModule } from './plans/plans.module';

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
    UsersModule,
    MuralsModule,
    CollectionsModule,
    PinsModule,
    AuthModule,
    DatabaseModule,
    CredentialsModule,
    CacheModule,
    CommonModule,
    PaymentModule,
    SubscriptionModule,
    PlansModule,
  ],
})
export class AppModule {}
