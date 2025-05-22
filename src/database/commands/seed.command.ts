import { Command, CommandRunner, Option } from 'nest-commander';
import { DatabaseService } from '../database.service';

@Command({ name: 'seed', description: 'Seed database operations' })
export class SeedCommand extends CommandRunner {
  constructor(private readonly databaseService: DatabaseService) {
    super();
  }

  async run(inputs: string[], options?: any): Promise<void> {
    try {
      if (options.clearAndSeed) {
        await this.databaseService.clearAndSeed();
      } else {
        await this.databaseService.seed();
      }
      console.log('Operation completed successfully!');
    } catch (error) {
      console.error('Error during operation:', error);
      process.exit(1);
    }
  }

  @Option({
    flags: '--clear-and-seed',
    description: 'Clear all tables before seeding',
  })
  parseBoolean(): boolean {
    return true;
  }
}
