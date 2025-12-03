import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UserEntity } from 'src/users/entities/user.entity';
import { Plan } from 'src/plans/entities/plan.entity';
import { CredentialsService } from 'src/credentials/credentials.service';
import { seedPlans } from './seeds/plans.seed';
import { seedUsers } from './seeds/users.seed';

@Injectable()
export class DatabaseService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(Plan)
    private readonly plansRepository: Repository<Plan>,
    private readonly configService: ConfigService,
    private readonly credentialsService: CredentialsService,
  ) {}

  private async clearAllTables() {
    try {
      // Deactivate foreign key check
      await this.usersRepository.query('SET FOREIGN_KEY_CHECKS = 0');

      // Clear tables (order matters due to foreign keys)
      await this.usersRepository.query('TRUNCATE TABLE subscriptions');
      await this.usersRepository.query('TRUNCATE TABLE users');
      await this.plansRepository.query('TRUNCATE TABLE plans');

      // Activate foreign key check
      await this.usersRepository.query('SET FOREIGN_KEY_CHECKS = 1');

      console.log('All tables cleared successfully');
    } catch (error) {
      console.error('Error clearing tables:', error);
      throw error;
    }
  }

  async seed() {
    try {
      console.log('Starting seed process...');

      // Seed plans first (users depend on plans via subscriptions)
      await seedPlans(this.plansRepository, this.configService);

      // Seed users
      await seedUsers(this.usersRepository, this.credentialsService);

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
