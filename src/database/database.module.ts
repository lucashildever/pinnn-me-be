import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseService } from './database.service';
import { UserEntity } from 'src/users/entities/user.entity';
import { MuralEntity } from 'src/murals/entities/mural.entity';
import { CollectionEntity } from 'src/collections/entities/collection.entity';
import { PinEntity } from 'src/pins/entities/pin.entity';
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
