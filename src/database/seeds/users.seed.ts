import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { usersData } from './data/users.data';
import * as bcrypt from 'bcrypt';

export async function seedUsers(userRepository: Repository<User>) {
  try {
    for (const userData of usersData) {
      const exists = await userRepository.findOne({
        where: { email: userData.email },
      });

      if (!exists) {
        const user = userRepository.create({
          ...userData,
          password: await bcrypt.hash(userData.password, 10),
        });
        await userRepository.save(user);
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
