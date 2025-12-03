import { Repository } from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { usersData } from './data/users.data';
import { CredentialsService } from 'src/credentials/credentials.service';

export async function seedUsers(
  usersRepository: Repository<UserEntity>,
  credentialsService: CredentialsService,
) {
  try {
    for (const userData of usersData) {
      const exists = await usersRepository.findOne({
        where: { email: userData.email },
      });

      if (!exists) {
        const user = usersRepository.create({
          username: userData.username,
          email: userData.email,
          password: await credentialsService.hashPassword(userData.password),
        });
        await usersRepository.save(user);
        console.log(`User ${userData.username} created successfully`);
      } else {
        console.log(`User ${userData.username} already exists`);
      }
    }
  } catch (error) {
    console.error('Error seeding users:', error);
    throw error;
  }
}
