import { Repository } from 'typeorm';
import { PinEntity } from 'src/pins/entities/pin.entity';
import { CollectionEntity } from 'src/collections/entities/collection.entity';
import { pinsData } from './data/pins.data';

export async function seedPins(
  pinRepository: Repository<PinEntity>,
  collectionRepository: Repository<CollectionEntity>,
) {
  // try {
  //   for (const pinData of pinsData) {
  //     const collection = await collectionRepository.findOne({
  //       where: { id: pinData.collection_id },
  //     });
  //     if (!collection) {
  //       console.log(`Collection with ID ${pinData.collection_id} not found`);
  //       continue;
  //     }
  //     const exists = await pinRepository.findOne({
  //       where: {
  //         description: pinData.description,
  //         collection_id: pinData.collection_id,
  //       },
  //     });
  //     if (!exists) {
  //       const pin = pinRepository.create({
  //         ...pinData,
  //         collection: collection,
  //       });
  //       await pinRepository.save(pin);
  //       console.log(`Pin "${pinData.description}" created successfully`);
  //     } else {
  //       console.log(`Pin "${pinData.description}" already exists`);
  //     }
  //   }
  // } catch (error) {
  //   console.error('Error seeding pins:', error);
  //   throw error;
  // }
}
