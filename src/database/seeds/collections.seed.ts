import { Repository } from 'typeorm';
import { CollectionEntity } from 'src/collection/entities/collection.entity';
import { MuralEntity } from 'src/mural/entities/mural.entity';
import { collectionsData } from './data/collections.data';

export async function seedCollections(
  collectionRepository: Repository<CollectionEntity>,
  muralRepository: Repository<MuralEntity>,
) {
  // try {
  //   for (const collectionData of collectionsData) {
  //     const mural = await muralRepository.findOne({
  //       where: { id: collectionData.muralId },
  //     });
  //     if (!mural) {
  //       console.log(`Mural with ID ${collectionData.muralId} not found`);
  //       continue;
  //     }
  //     const exists = await collectionRepository.findOne({
  //       where: {
  //         content: collectionData.content,
  //         mural_id: collectionData.mural_id,
  //       },
  //     });
  //     if (!exists) {
  //       const collection = collectionRepository.create({
  //         ...collectionData,
  //         mural: mural,
  //       });
  //       await collectionRepository.save(collection);
  //       console.log(
  //         `Collection "${collectionData.content}" created successfully`,
  //       );
  //     } else {
  //       console.log(`Collection "${collectionData.content}" already exists`);
  //     }
  //   }
  // } catch (error) {
  //   console.error('Error seeding collections:', error);
  //   throw error;
  // }
}
