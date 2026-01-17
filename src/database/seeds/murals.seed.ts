import { Repository } from 'typeorm';
import { MuralEntity } from 'src/murals/entities/mural.entity';
import { MuralAppearanceEntity } from 'src/murals/entities/mural-appearance.entity';
import { CollectionEntity } from 'src/collections/entities/collection.entity';
import { DisplayElementEntity } from 'src/common/entities/display-element.entity';
import { UserEntity } from 'src/users/entities/user.entity';

export async function seedMurals(
  muralsRepository: Repository<MuralEntity>,
  appearanceRepository: Repository<MuralAppearanceEntity>,
  collectionsRepository: Repository<CollectionEntity>,
  displayElementRepository: Repository<DisplayElementEntity>,
  usersRepository: Repository<UserEntity>,
) {
  try {
    const users = await usersRepository.find();

    for (const user of users) {
      const existingMural = await muralsRepository.findOne({
        where: { userId: user.id },
      });

      if (!existingMural) {
        const muralName = user.username
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-');

        const mural = muralsRepository.create({
          userId: user.id,
          name: muralName,
          displayName: `${user.username}'s Mural`,
        });
        const savedMural = await muralsRepository.save(mural);

        const displayElement = displayElementRepository.create({
          content: 'Main Collection',
          iconConfig: { type: 'emoji', unicode: '📝' },
        });
        const savedDisplayElement =
          await displayElementRepository.save(displayElement);

        const collection = collectionsRepository.create({
          muralId: savedMural.id,
          displayElementId: savedDisplayElement.id,
          isMain: true,
          order: '0',
        });
        await collectionsRepository.save(collection);

        const appearance = appearanceRepository.create({
          muralId: savedMural.id,
        });
        await appearanceRepository.save(appearance);

        await usersRepository.update(
          { id: user.id },
          { activeMuralId: savedMural.id },
        );

        console.log(`Mural "${muralName}" created for user ${user.username}`);
      } else {
        console.log(`User ${user.username} already has a mural`);
      }
    }
  } catch (error) {
    console.error('Error seeding murals:', error);
    throw error;
  }
}
