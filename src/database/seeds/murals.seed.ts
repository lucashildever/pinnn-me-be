import { Repository } from 'typeorm';
import { MuralEntity } from 'src/murals/entities/mural.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { muralsData } from './data/murals.data';

export async function seedMurals(
  muralsRepository: Repository<MuralEntity>,
  usersRepository: Repository<UserEntity>,
) {
  // for (const muralData of muralsData) {
  //   const user = await usersRepository.findOne({
  //     where: { id: muralData.user_id },
  //   });
  //   if (user) {
  //     const exists = await muralsRepository.findOne({
  //       where: { name: muralData.name },
  //     });
  //     if (!exists) {
  //       const mural = muralsRepository.create({
  //         name: muralData.name,
  //         displayName: muralData.displayName,
  //         description: muralData.description,
  //         user_id: user.id,
  //       });
  //       await muralsRepository.save(mural);
  //       console.log(`Mural "${muralData.name}" created successfully`);
  //     } else {
  //       console.log(`Mural "${muralData.name}" already exists`);
  //     }
  //   } else {
  //     console.log(`User with ID ${muralData.user_id} not found`);
  //   }
  // }
}
