import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { MuralEntity } from 'src/murals/entities/mural.entity';
import { CollectionEntity } from 'src/collections/entities/collection.entity';
import { PinEntity } from 'src/pins/entities/pin.entity';
import { seedUsers } from './seeds/users.seed';
import { seedMurals } from './seeds/murals.seed';
import { seedCollections } from './seeds/collections.seed';
import { seedPins } from './seeds/pins.seed';

@Injectable()
export class DatabaseService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(MuralEntity)
    private readonly muralsRepository: Repository<MuralEntity>,
    @InjectRepository(CollectionEntity)
    private readonly collectionsRepository: Repository<CollectionEntity>,
    @InjectRepository(PinEntity)
    private readonly pinsRepository: Repository<PinEntity>,
  ) {}

  private async clearAllTables() {
    try {
      // deactivate foreign key check
      await this.usersRepository.query('SET FOREIGN_KEY_CHECKS = 0');

      // keep this order
      await this.pinsRepository.query('TRUNCATE TABLE pins');
      await this.collectionsRepository.query('TRUNCATE TABLE collections');
      await this.muralsRepository.query('TRUNCATE TABLE murals');
      await this.usersRepository.query('TRUNCATE TABLE users');

      // activate foreign key check
      await this.usersRepository.query('SET FOREIGN_KEY_CHECKS = 1');

      console.log('All tables cleared successfully');
    } catch (error) {
      console.error('Error clearing tables:', error);
      throw error;
    }
  }

  async seed() {
    try {
      // keep this order
      // await seedUsers(this.userRepository);
      // await seedMurals(this.muralRepository, this.userRepository);
      // await seedCollections(this.collectionRepository, this.muralRepository);
      // await seedPins(this.pinRepository, this.collectionRepository);

      console.log('Seed completed successfully');
    } catch (error) {
      console.error('Error during seed:', error);
      throw error;
    }
  }

  async clearAndSeed() {
    try {
      console.log('Starting clear and seed process...');
      await this.clearAllTables();
      await this.seed();
      console.log('Clear and seed process completed successfully');
    } catch (error) {
      console.error('Error during clear and seed process:', error);
      throw error;
    }
  }
}
