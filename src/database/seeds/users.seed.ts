import { Repository } from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { usersData } from './data/users.data';
import * as bcrypt from 'bcrypt';

export async function seedUsers(usersRepository: Repository<UserEntity>) {
  try {
    for (const userData of usersData) {
      const exists = await usersRepository.findOne({
        where: { email: userData.email },
      });

      if (!exists) {
        const user = usersRepository.create({
          ...userData,
          password: await bcrypt.hash(userData.password, 10),
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
