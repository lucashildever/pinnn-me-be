import { Repository } from 'typeorm';
import { Mural } from 'src/mural/entities/mural.entity';
import { User } from 'src/user/entities/user.entity';
import { muralsData } from './data/murals.data';

export async function seedMurals(
  muralRepository: Repository<Mural>,
  userRepository: Repository<User>,
) {
  for (const muralData of muralsData) {
    const user = await userRepository.findOne({
      where: { id: muralData.user_id },
    });

    if (user) {
      const exists = await muralRepository.findOne({
        where: { name: muralData.name },
      });

      if (!exists) {
        const mural = muralRepository.create({
          name: muralData.name,
          displayName: muralData.displayName,
          description: muralData.description,
          user_id: user.id,
        });
        await muralRepository.save(mural);
        console.log(`Mural "${muralData.name}" created successfully`);
      } else {
        console.log(`Mural "${muralData.name}" already exists`);
      }
    } else {
      console.log(`User with ID ${muralData.user_id} not found`);
    }
  }
}
