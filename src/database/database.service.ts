import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { Mural } from 'src/mural/entities/mural.entity';
import { seedUsers } from './seeds/users.seed';
import { seedMurals } from './seeds/murals.seed';

@Injectable()
export class DatabaseService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Mural)
    private readonly muralRepository: Repository<Mural>,
  ) {}

  private async clearAllTables() {
    try {
      // Desabilita verificação de chaves estrangeiras
      await this.userRepository.query('SET FOREIGN_KEY_CHECKS = 0');

      // Limpa todas as tabelas na ordem correta
      await this.muralRepository.query('TRUNCATE TABLE mural');
      await this.userRepository.query('TRUNCATE TABLE user');

      // Reabilita verificação de chaves estrangeiras
      await this.userRepository.query('SET FOREIGN_KEY_CHECKS = 1');

      console.log('All tables cleared successfully');
    } catch (error) {
      console.error('Error clearing tables:', error);
      throw error;
    }
  }

  async seed() {
    try {
      await seedUsers(this.userRepository);
      await seedMurals(this.muralRepository, this.userRepository);
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
