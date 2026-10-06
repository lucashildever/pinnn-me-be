import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UserEntity } from 'src/users/entities/user.entity';
import { Plan } from 'src/plans/entities/plan.entity';
import { CredentialsService } from 'src/credentials/credentials.service';
import { seedPlans } from './seeds/plans.seed';
import { seedUsers } from './seeds/users.seed';
import { seedMurals } from './seeds/murals.seed';
import { seedSubscriptions } from './seeds/subscriptions.seed';
import { Subscription } from 'src/subscriptions/entities/subscription.entity';
import { MuralEntity } from 'src/murals/entities/mural.entity';
import { MuralAppearanceEntity } from 'src/murals/entities/mural-appearance.entity';
import { CollectionEntity } from 'src/collections/entities/collection.entity';
import { DisplayElementEntity } from 'src/common/entities/display-element.entity';

@Injectable()
export class DatabaseService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(Plan)
    private readonly plansRepository: Repository<Plan>,
    @InjectRepository(Subscription)
    private readonly subscriptionsRepository: Repository<Subscription>,
    @InjectRepository(MuralEntity)
    private readonly muralsRepository: Repository<MuralEntity>,
    @InjectRepository(MuralAppearanceEntity)
    private readonly appearanceRepository: Repository<MuralAppearanceEntity>,
    @InjectRepository(CollectionEntity)
    private readonly collectionsRepository: Repository<CollectionEntity>,
    @InjectRepository(DisplayElementEntity)
    private readonly displayElementRepository: Repository<DisplayElementEntity>,
    private readonly configService: ConfigService,
    private readonly credentialsService: CredentialsService,
  ) {}

  private async clearAllTables() {
    try {
      // Deactivate foreign key check
      await this.usersRepository.query('SET FOREIGN_KEY_CHECKS = 0');

      // Clear tables (order matters due to foreign keys)
      // Start with most dependent tables first
      await this.usersRepository.query('TRUNCATE TABLE payments');
      await this.usersRepository.query('TRUNCATE TABLE payment_attempts');
      await this.usersRepository.query('TRUNCATE TABLE invoices');
      await this.usersRepository.query('TRUNCATE TABLE billing_info');
      await this.usersRepository.query('TRUNCATE TABLE call_to_actions');
      await this.usersRepository.query('TRUNCATE TABLE form_submissions');
      await this.usersRepository.query('TRUNCATE TABLE variants');
      await this.usersRepository.query('TRUNCATE TABLE pins');
      await this.usersRepository.query('TRUNCATE TABLE pin_meta');
      await this.usersRepository.query('TRUNCATE TABLE resources');
      await this.usersRepository.query('TRUNCATE TABLE resource_meta');
      await this.usersRepository.query('TRUNCATE TABLE pinned_resources');
      await this.usersRepository.query('TRUNCATE TABLE collections');
      await this.usersRepository.query('TRUNCATE TABLE display_elements');
      await this.usersRepository.query('TRUNCATE TABLE mural_appearances');
      await this.usersRepository.query('TRUNCATE TABLE murals');
      await this.usersRepository.query('TRUNCATE TABLE subscriptions');
      await this.usersRepository.query('TRUNCATE TABLE refresh_tokens');
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

      await seedPlans(this.plansRepository, this.configService);

      await seedUsers(this.usersRepository, this.credentialsService);

      await seedMurals(
        this.muralsRepository,
        this.appearanceRepository,
        this.collectionsRepository,
        this.displayElementRepository,
        this.usersRepository,
      );

      await seedSubscriptions(
        this.subscriptionsRepository,
        this.usersRepository,
        this.plansRepository,
      );

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
