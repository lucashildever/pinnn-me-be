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

import { CollectionsService } from 'src/collections/collections.service';
import { CredentialsService } from 'src/credentials/credentials.service';
import { CacheService } from 'src/cache/cache.service';
import { UsersService } from 'src/users/users.service';
import { PinsService } from 'src/pins/pins.service';

import { MuralEntity } from './entities/mural.entity';
import { Status } from 'src/common/enums/status.enum';
import { CallToActionDto } from './dto/call-to-action/call-to-action.dto';
import { CallToActionEntity } from './entities/call-to-action.entity';
import { DisplayElementEntity } from 'src/common/entities/display-element.entity';
import { IconType } from 'src/common/enums/icon-type.enum';
import { UpdateCallToActionDto } from './dto/call-to-action/update-call-to-action.dto';
import { CreateCallToActionDto } from './dto/call-to-action/create-call-to-action.dto';

@Injectable()
export class MuralsService {
  constructor(
    @InjectRepository(MuralEntity)
    private readonly muralsRepository: Repository<MuralEntity>,
    @InjectRepository(CallToActionEntity)
    private readonly callToActionsRepository: Repository<CallToActionEntity>,
    @InjectRepository(DisplayElementEntity)
    private readonly displayElementRepository: Repository<DisplayElementEntity>,

    private readonly collectionsService: CollectionsService,
    private readonly credentialsService: CredentialsService,
    private readonly cacheService: CacheService,
    private readonly usersService: UsersService,
    private readonly pinsService: PinsService,
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

    const collections = (await this.collectionsService.findAll(mural.id)).map(
      (collection) => ({
        id: collection.id,
        order: collection.order,
        isMain: collection.isMain,
        displayElement: {
          content: collection.displayElement.content,
          iconConfig: collection.displayElement.iconConfig,
        },
      }),
    );

    const response: MuralResponseDto = {
      id: mural.id,
      name: mural.name,
      displayName: mural.displayName,
      description: mural.description,
      collections,
    };

    const callToActions = await this.callToActionsRepository.find({
      where: { muralId: mural.id },
      relations: ['displayElement'],
      order: { createdAt: 'ASC' },
    });

    const ctas = callToActions.map((cta) => ({
      id: cta.id,
      content: cta.displayElement.content,
      iconConfig: cta.displayElement.iconConfig,
      callToActionConfig: cta.callToActionConfig,
    }));

    if (ctas.length > 0) {
      response.callToActions = ctas;
    }

    if (getMainCollectionPins) {
      try {
        const mainCollection = await this.collectionsService.findMain(mural.id);
        response.mainCollectionPins = await this.pinsService.findPaginated(
          mainCollection.id,
          { page: 1, limit: 5 },
        );
      } catch (err) {
        if (err instanceof NotFoundException) {
          response.mainCollectionPins = {
            data: [],
            pagination: {
              currentPage: 1,
              totalItems: 0,
              itemsPerPage: 5,
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

    const mural = this.muralsRepository.create({ userId, ...muralDto });

    const savedMural = await this.muralsRepository.save(mural);

    await this.collectionsService.create(savedMural.id, {
      isMain: true,
      displayElement: {
        content: 'Main Collection',
        iconConfig: { type: IconType.EMOJI, unicode: '📝' },
      },
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

    await this.muralsRepository.update({ id: muralId }, updateMuralDto);

    const updatedMural = await this.muralsRepository.findOneBy({
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

    const user = await this.usersService.findOrFail(mural.userId, true, [
      'password',
    ]);

    await this.credentialsService.validatePassword(
      deleteMuralDto.password,
      user.password,
    );

    await this.muralsRepository.update(
      { id: muralId },
      { status: Status.Deleted },
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

    const existingMural = await this.muralsRepository.findOneBy({
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
      ...(onlyActive ? { status: Status.Active } : {}),
    };

    let mural: MuralEntity | null;

    if (selectFields) {
      mural = await this.muralsRepository.findOne({
        where: whereCondition,
        select: selectFields as (keyof MuralEntity)[],
      });
    } else {
      mural = await this.muralsRepository.findOneBy(whereCondition);
    }

    if (!mural) {
      throw new NotFoundException('Mural not found!');
    }

    return mural;
  }

  async createCallToAction(
    muralId: string,
    createCallToActionDto: CreateCallToActionDto,
  ): Promise<CallToActionDto> {
    const mural = await this.muralsRepository.findOne({
      where: { id: muralId },
    });
    if (!mural) {
      throw new NotFoundException(`Mural com ID ${muralId} não encontrado`);
    }

    const displayElement = this.displayElementRepository.create({
      content: createCallToActionDto.content,
      iconConfig: createCallToActionDto.iconConfig,
    });

    const savedDisplayElement =
      await this.displayElementRepository.save(displayElement);

    const callToAction = this.callToActionsRepository.create({
      muralId: muralId,
      displayElementId: savedDisplayElement.id,
      callToActionConfig: createCallToActionDto.callToActionConfig,
    });

    const savedCallToAction =
      await this.callToActionsRepository.save(callToAction);

    const createdCallToAction =
      await this.callToActionsRepository.findOneOrFail({
        where: { id: savedCallToAction.id },
        relations: ['displayElement'],
      });

    return {
      id: createdCallToAction.id,
      content: createdCallToAction.displayElement.content,
      iconConfig: createdCallToAction.displayElement.iconConfig,
      callToActionConfig: createdCallToAction.callToActionConfig,
    };
  }

  async updateCallToAction(
    callToActionId: string,
    updateCallToActionDto: UpdateCallToActionDto,
  ): Promise<CallToActionDto> {
    const existingCallToAction = await this.callToActionsRepository.findOne({
      where: { id: callToActionId },
      relations: ['displayElement'],
    });

    if (!existingCallToAction) {
      throw new NotFoundException(
        `CallToAction com ID ${callToActionId} não encontrado`,
      );
    }

    if (
      updateCallToActionDto.content !== undefined ||
      updateCallToActionDto.iconConfig !== undefined
    ) {
      const displayElementUpdateData: Partial<DisplayElementEntity> = {};

      if (updateCallToActionDto.content !== undefined) {
        displayElementUpdateData.content = updateCallToActionDto.content;
      }

      if (updateCallToActionDto.iconConfig !== undefined) {
        displayElementUpdateData.iconConfig = updateCallToActionDto.iconConfig;
      }

      await this.displayElementRepository.update(
        existingCallToAction.displayElementId,
        displayElementUpdateData,
      );
    }

    if (updateCallToActionDto.callToActionConfig !== undefined) {
      const callToActionUpdateData: Partial<CallToActionEntity> = {
        callToActionConfig: updateCallToActionDto.callToActionConfig,
      };

      await this.callToActionsRepository.update(
        callToActionId,
        callToActionUpdateData,
      );
    }

    const callToAction = await this.callToActionsRepository.findOneOrFail({
      where: { id: callToActionId },
      relations: ['displayElement'],
    });

    return {
      id: callToAction.id,
      content: callToAction.displayElement.content,
      iconConfig: callToAction.displayElement.iconConfig,
      callToActionConfig: callToAction.callToActionConfig,
    };
  }
}
