import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from './database.service';
import { UserEntity } from 'src/users/entities/user.entity';
import { Plan } from 'src/plans/entities/plan.entity';
import { Subscription } from 'src/subscriptions/entities/subscription.entity';
import { MuralEntity } from 'src/murals/entities/mural.entity';
import { MuralAppearanceEntity } from 'src/murals/entities/mural-appearance.entity';
import { CollectionEntity } from 'src/collections/entities/collection.entity';
import { DisplayElementEntity } from 'src/common/entities/display-element.entity';
import { SeedCommand } from './commands/seed.command';
import { CredentialsModule } from 'src/credentials/credentials.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      Plan,
      Subscription,
      MuralEntity,
      MuralAppearanceEntity,
      CollectionEntity,
      DisplayElementEntity,
    ]),
    ConfigModule,
    CredentialsModule,
  ],
  providers: [DatabaseService, SeedCommand],
  exports: [DatabaseService],
})
export class DatabaseModule {}
