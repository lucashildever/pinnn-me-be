import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from './database.service';
import { UserEntity } from 'src/users/entities/user.entity';
import { Plan } from 'src/plans/entities/plan.entity';
import { SeedCommand } from './commands/seed.command';
import { CredentialsModule } from 'src/credentials/credentials.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, Plan]),
    ConfigModule,
    CredentialsModule,
  ],
  providers: [DatabaseService, SeedCommand],
  exports: [DatabaseService],
})
export class DatabaseModule {}
