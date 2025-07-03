import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseService } from './database.service';
import { UserEntity } from 'src/user/entities/user.entity';
import { MuralEntity } from 'src/mural/entities/mural.entity';
import { CollectionEntity } from 'src/collection/entities/collection.entity';
import { PinEntity } from 'src/pin/entities/pin.entity';
import { SeedCommand } from './commands/seed.command';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      MuralEntity,
      CollectionEntity,
      PinEntity,
    ]),
  ],
  providers: [DatabaseService, SeedCommand],
  exports: [DatabaseService],
})
export class DatabaseModule {}
