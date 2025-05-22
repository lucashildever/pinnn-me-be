import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseService } from './database.service';
import { SeedCommand } from './commands/seed.command';
import { User } from 'src/user/entities/user.entity';
import { Mural } from 'src/mural/entities/mural.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Mural])],
  providers: [DatabaseService, SeedCommand],
  exports: [DatabaseService],
})
export class DatabaseModule {}
