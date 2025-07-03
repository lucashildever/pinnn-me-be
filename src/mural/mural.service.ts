import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UpdateMuralResponseDto } from './dto/update-mural-response.dto';
import { MuralResponseDto } from './dto/mural-response.dto';
import { UpdateMuralDto } from './dto/update-mural.dto';
import { DeleteMuralDto } from './dto/delete-mural.dto';
import { MuralDto } from './dto/mural.dto';

import { CollectionService } from 'src/collection/collection.service';
import { CredentialService } from 'src/credential/credential.service';
import { CacheService } from 'src/cache/cache.service';
import { UserService } from 'src/user/user.service';
import { PinService } from 'src/pin/pin.service';

import { TabType } from '../collection/enums/tab-type.enum';
import { Status } from 'src/common/enums/status.enum';

import { MuralEntity } from './entities/mural.entity';

@Injectable()
export class MuralService {
  constructor(
    @InjectRepository(MuralEntity)
    private readonly muralRepository: Repository<MuralEntity>,
    private readonly collectionService: CollectionService,
    private readonly credentialService: CredentialService,
    private readonly cacheService: CacheService,
    private readonly userService: UserService,
    private readonly pinService: PinService,
  ) {}

  private readonly MURAL_CACHE_KEY = (muralName: string, withPins: boolean) =>
    `mural:${muralName}:${withPins}`;
  private readonly MURAL_NAME_CACHE_KEY = (name: string) =>
    `mural:name:${name}`;
  private readonly CACHE_TTL = 300;
  private readonly NAME_CACHE_TTL = this.CACHE_TTL / 5;

  async find(
    muralName: string,
    getMainCollectionPins: boolean = false,
    includeInactives: boolean = false,
  ): Promise<MuralResponseDto> {
    const cacheKey = this.MURAL_CACHE_KEY(muralName, getMainCollectionPins);
    const cachedMural = await this.cacheService.get<MuralResponseDto>(cacheKey);

    if (cachedMural) {
      return cachedMural;
    }

    const mural = await this.findOrFail(muralName, !includeInactives);

    const collections = (await this.collectionService.findAll(mural.id)).map(
      (collection) => ({
        id: collection.id,
        order: collection.order,
        type: collection.type,
        isMain: collection.isMain,
        icon: collection.icon,
        content: collection.content,
      }),
    );

    const response: MuralResponseDto = {
      id: mural.id,
      name: mural.name,
      displayName: mural.displayName,
      description: mural.description,
      collections,
    };

    if (getMainCollectionPins) {
      try {
        const mainCollection = await this.collectionService.findMain(mural.id);
        response.mainCollectionPins = await this.pinService.findPaginated(
          mainCollection.id,
          { page: 1, limit: 5 },
        );
      } catch (err) {
        if (err instanceof NotFoundException) {
          response.mainCollectionPins = {
            data: [],
            pagination: {
              currentPage: 1,
              totalPages: 1,
              totalItems: 0,
              itemsPerPage: 5,
              hasNextPage: false,
              hasPreviousPage: false,
            },
          };
        } else {
          throw err;
        }
      }
    }
    await this.cacheService.set(cacheKey, response, this.CACHE_TTL);

    return response;
  }

  async create(userId: string, muralDto: MuralDto): Promise<MuralResponseDto> {
    await this.checkMuralNameAvailability(muralDto.name);

    const mural = this.muralRepository.create({ userId, ...muralDto });

    const savedMural = await this.muralRepository.save(mural);

    await this.collectionService.create(savedMural.id, {
      isMain: true,
      content: 'Main Collection',
      type: TabType.EMOJI,
      icon: '🔵',
    });

    const response: MuralResponseDto = {
      id: savedMural.id,
      name: savedMural.name,
      displayName: savedMural.displayName,
      description: savedMural.description,
    };

    await this.cacheService.del(this.MURAL_NAME_CACHE_KEY(muralDto.name));

    return response;
  }

  async update(
    muralId: string,
    updateMuralDto: UpdateMuralDto,
  ): Promise<UpdateMuralResponseDto> {
    const currentMural = await this.findOrFail(muralId);

    if (updateMuralDto.name && updateMuralDto.name !== currentMural.name) {
      await this.checkMuralNameAvailability(updateMuralDto.name);
    }

    await this.muralRepository.update({ id: muralId }, updateMuralDto);

    const updatedMural = await this.muralRepository.findOneBy({
      id: muralId,
    });

    if (!updatedMural) {
      throw new InternalServerErrorException(
        'Failed to retrieve updated mural',
      );
    }
    // clean up the old name cache
    await this.cacheService.del(this.MURAL_CACHE_KEY(currentMural.name, true));
    await this.cacheService.del(this.MURAL_CACHE_KEY(currentMural.name, false));
    await this.cacheService.del(this.MURAL_NAME_CACHE_KEY(currentMural.name));

    // If name changed, clean up the cache for it
    if (updateMuralDto.name && updateMuralDto.name !== currentMural.name) {
      await this.cacheService.del(
        this.MURAL_CACHE_KEY(updateMuralDto.name, true),
      );
      await this.cacheService.del(
        this.MURAL_CACHE_KEY(updateMuralDto.name, false),
      );
      // Clean up cache for new name availability
      await this.cacheService.del(
        this.MURAL_NAME_CACHE_KEY(updateMuralDto.name),
      );
    }

    const response: UpdateMuralResponseDto = {
      message: `Mural ${updatedMural.displayName} was successfully updated!`,
      updatedMural: {
        name: updatedMural.name,
        displayName: updatedMural.displayName,
        description: updatedMural.description,
      },
    };

    return response;
  }

  async softDelete(
    muralId: string,
    deleteMuralDto: DeleteMuralDto,
  ): Promise<{ message: string }> {
    const mural = await this.findOrFail(muralId, true, ['userId', 'name']);

    const user = await this.userService.findOrFail(mural.userId, true, [
      'password',
    ]);

    await this.credentialService.validatePassword(
      deleteMuralDto.password,
      user.password,
    );

    await this.muralRepository.update(
      { id: muralId },
      { status: Status.DELETED },
    );

    await this.cacheService.del(this.MURAL_CACHE_KEY(mural.name, true));
    await this.cacheService.del(this.MURAL_CACHE_KEY(mural.name, false));
    await this.cacheService.del(this.MURAL_NAME_CACHE_KEY(mural.name));

    return {
      message: `Mural "${mural.name}" has been successfully deleted`,
    };
  }

  private async checkMuralNameAvailability(muralName: string): Promise<void> {
    const cacheKey = this.MURAL_NAME_CACHE_KEY(muralName);
    const cached = await this.cacheService.get<boolean>(cacheKey);

    if (cached !== undefined) {
      if (cached) {
        throw new BadRequestException(
          `Mural with name "${muralName}" already exists`,
        );
      }
      return;
    }

    const existingMural = await this.muralRepository.findOneBy({
      name: muralName,
    });

    const exists = !!existingMural;

    await this.cacheService.set(cacheKey, exists, this.NAME_CACHE_TTL);

    if (exists) {
      throw new BadRequestException(
        `Mural with name "${muralName}" already exists`,
      );
    }
  }

  async findOrFail(
    identifier: string,
    onlyActive: boolean = true,
    selectFields?: string[],
  ): Promise<MuralEntity> {
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        identifier,
      );

    const whereCondition = {
      ...(isUUID ? { id: identifier } : { name: identifier }),
      ...(onlyActive ? { status: Status.ACTIVE } : {}),
    };

    let mural: MuralEntity | null;

    if (selectFields) {
      mural = await this.muralRepository.findOne({
        where: whereCondition,
        select: selectFields as (keyof MuralEntity)[],
      });
    } else {
      mural = await this.muralRepository.findOneBy(whereCondition);
    }

    if (!mural) {
      throw new NotFoundException('Mural not found!');
    }

    return mural;
  }
}
