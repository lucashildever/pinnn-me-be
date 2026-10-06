import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsWhere,
  Repository,
  EntityManager,
  DataSource,
} from 'typeorm';

import { UpdateMuralResponseDto } from './dto/update-mural-response.dto';
import { MuralResponseDto } from './dto/mural-response.dto';
import { UpdateMuralDto } from './dto/update-mural.dto';
import { DeleteMuralDto } from './dto/delete-mural.dto';
import { MuralDto } from './dto/mural.dto';

import { CollectionsService } from 'src/collections/collections.service';
import { CredentialsService } from 'src/credentials/credentials.service';
import { CacheService } from 'src/cache/cache.service';
import { UsersService } from 'src/users/users.service';
import { ResourcesService } from 'src/resources/resources.service';

import { MuralEntity } from './entities/mural.entity';
import { MuralAppearanceEntity } from './entities/mural-appearance.entity';
import { CallToActionDto } from './dto/call-to-action/call-to-action.dto';
import { CallToActionEntity } from './entities/call-to-action.entity';
import { FormSubmissionEntity } from './entities/form-submission.entity';
import { DisplayElementEntity } from 'src/common/entities/display-element.entity';
import { UpdateCallToActionDto } from './dto/call-to-action/update-call-to-action.dto';
import { CreateCallToActionDto } from './dto/call-to-action/create-call-to-action.dto';
import { CreateMuralAppearanceDto } from './dto/appearance/create-mural-appearance.dto';
import { UpdateMuralAppearanceDto } from './dto/appearance/update-mural-appearance.dto';
import { MuralAppearanceDto } from './dto/appearance/mural-appearance.dto';

@Injectable()
export class MuralsService {
  constructor(
    @InjectRepository(MuralEntity)
    private readonly muralsRepository: Repository<MuralEntity>,
    @InjectRepository(CallToActionEntity)
    private readonly callToActionsRepository: Repository<CallToActionEntity>,
    @InjectRepository(DisplayElementEntity)
    private readonly displayElementRepository: Repository<DisplayElementEntity>,
    @InjectRepository(MuralAppearanceEntity)
    private readonly appearanceRepository: Repository<MuralAppearanceEntity>,
    @InjectRepository(FormSubmissionEntity)
    private readonly formSubmissionsRepository: Repository<FormSubmissionEntity>,

    private readonly collectionsService: CollectionsService,
    private readonly credentialsService: CredentialsService,
    private readonly cacheService: CacheService,
    private readonly usersService: UsersService,
    private readonly resourcesService: ResourcesService,
    private readonly dataSource: DataSource,
  ) {}

  private readonly MURAL_CACHE_KEY = (
    muralName: string,
    withResources: boolean,
  ) => `mural:${muralName}:${withResources}`;
  private readonly MURAL_NAME_CACHE_KEY = (name: string) =>
    `mural:name:${name}`;
  private readonly CACHE_TTL = 300;
  private readonly NAME_CACHE_TTL = this.CACHE_TTL / 5;

  async findAllByUser(userId: string): Promise<{
    murals: {
      id: string;
      name: string;
      displayName: string;
      isActive: boolean;
    }[];
    activeMuralId: string | null;
  }> {
    const murals = await this.muralsRepository.find({
      where: { userId },
      select: ['id', 'name', 'displayName'],
      order: { createdAt: 'ASC' },
    });

    const activeMuralId = await this.usersService.getActiveMural(userId);

    return {
      murals: murals.map((mural) => ({
        id: mural.id,
        name: mural.name,
        displayName: mural.displayName,
        isActive: mural.id === activeMuralId,
      })),
      activeMuralId: activeMuralId,
    };
  }

  async setActiveMuralForUser(
    userId: string,
    muralId: string,
  ): Promise<{ message: string; activeMuralId: string }> {
    const mural = await this.muralsRepository.findOne({
      where: { id: muralId },
      select: ['id', 'userId'],
    });

    if (!mural) {
      throw new NotFoundException('Mural not found');
    }

    if (mural.userId !== userId) {
      throw new BadRequestException('Mural does not belong to this user');
    }

    await this.usersService.setActiveMural(userId, muralId);

    return {
      message: 'Active mural updated successfully',
      activeMuralId: muralId,
    };
  }

  async find(
    muralName: string,
    getMainCollectionResources: boolean = false,
  ): Promise<MuralResponseDto> {
    const cacheKey = this.MURAL_CACHE_KEY(
      muralName,
      getMainCollectionResources,
    );
    const cachedMural = await this.cacheService.get<MuralResponseDto>(cacheKey);

    if (cachedMural) {
      return cachedMural;
    }

    const mural = await this.findOrFail(muralName);

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

    const appearance = await this.appearanceRepository.findOne({
      where: { muralId: mural.id },
    });

    const response: MuralResponseDto = {
      id: mural.id,
      name: mural.name,
      displayName: mural.displayName,
      description: mural.description,
      collections,
      appearance: appearance
        ? {
            id: appearance.id,
            profileImageUrl: appearance.profileImageUrl,
            coverImageUrl: appearance.coverImageUrl,
            themeConfig: appearance.themeConfig,
          }
        : undefined,
    };

    const callToActions = await this.callToActionsRepository.find({
      where: { muralId: mural.id },
      relations: ['displayElement'],
      order: { createdAt: 'ASC' },
    });

    const mappedCtas = callToActions.map((cta) => ({
      id: cta.id,
      content: cta.displayElement.content,
      iconConfig: cta.displayElement.iconConfig,
      config: cta.config,
    }));

    if (mappedCtas.length > 0) {
      response.callToActions = mappedCtas;
    }

    if (getMainCollectionResources) {
      const mainCollection = await this.collectionsService.findMain(mural.id);
      response.mainCollectionResources =
        await this.resourcesService.findResources(mainCollection.id, {
          page: 1,
          limit: 5,
        });
    }
    await this.cacheService.set(cacheKey, response, this.CACHE_TTL);

    return response;
  }

  async create(
    userId: string,
    muralDto: MuralDto,
    manager?: EntityManager,
  ): Promise<MuralResponseDto> {
    if (manager) {
      return this.createInTransaction(userId, muralDto, manager);
    }

    return this.dataSource.transaction((transactionManager) =>
      this.createInTransaction(userId, muralDto, transactionManager),
    );
  }

  private async createInTransaction(
    userId: string,
    muralDto: MuralDto,
    manager: EntityManager,
  ): Promise<MuralResponseDto> {
    await this.checkMuralNameAvailability(muralDto.name, manager);

    const mural = manager.create(MuralEntity, { userId, ...muralDto });

    const savedMural = await manager.save(MuralEntity, mural);

    await this.collectionsService.create(
      savedMural.id,
      {
        isMain: true,
        displayElement: {
          content: 'Main Collection',
          iconConfig: { type: 'emoji', unicode: '📝' },
        },
      },
      manager,
    );

    const appearance = manager.create(MuralAppearanceEntity, {
      muralId: savedMural.id,
    });
    const savedAppearance = await manager.save(
      MuralAppearanceEntity,
      appearance,
    );

    const currentActiveMural = await this.usersService.getActiveMural(
      userId,
      manager,
    );
    if (!currentActiveMural) {
      await this.usersService.setActiveMural(userId, savedMural.id, manager);
    }

    const response: MuralResponseDto = {
      id: savedMural.id,
      name: savedMural.name,
      displayName: savedMural.displayName,
      description: savedMural.description,
      appearance: {
        id: savedAppearance.id,
        profileImageUrl: savedAppearance.profileImageUrl,
        coverImageUrl: savedAppearance.coverImageUrl,
        themeConfig: savedAppearance.themeConfig,
      },
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

    await this.cacheService.del(this.MURAL_CACHE_KEY(currentMural.name, true));
    await this.cacheService.del(this.MURAL_CACHE_KEY(currentMural.name, false));
    await this.cacheService.del(this.MURAL_NAME_CACHE_KEY(currentMural.name));

    if (updateMuralDto.name && updateMuralDto.name !== currentMural.name) {
      await this.cacheService.del(
        this.MURAL_CACHE_KEY(updateMuralDto.name, true),
      );
      await this.cacheService.del(
        this.MURAL_CACHE_KEY(updateMuralDto.name, false),
      );

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

  async delete(
    muralId: string,
    deleteMuralDto: DeleteMuralDto,
  ): Promise<{ message: string }> {
    const mural = await this.findOrFail(muralId, ['userId', 'name']);

    const userMuralsCount = await this.muralsRepository.count({
      where: { userId: mural.userId },
    });

    if (userMuralsCount <= 1) {
      throw new BadRequestException(
        'Cannot delete the last mural. Every account must have at least one mural.',
      );
    }

    const user = await this.usersService.findOrFail(mural.userId, true, [
      'password',
      'activeMuralId',
    ]);

    await this.credentialsService.validatePassword(
      deleteMuralDto.password,
      user.password,
    );

    if (user.activeMuralId === muralId) {
      const nextMural = await this.muralsRepository.findOne({
        where: { userId: mural.userId },
        order: { createdAt: 'ASC' },
      });
      if (nextMural && nextMural.id !== muralId) {
        await this.usersService.setActiveMural(mural.userId, nextMural.id);
      }
    }

    await this.muralsRepository.delete({ id: muralId });

    await this.cacheService.del(this.MURAL_CACHE_KEY(mural.name, true));
    await this.cacheService.del(this.MURAL_CACHE_KEY(mural.name, false));
    await this.cacheService.del(this.MURAL_NAME_CACHE_KEY(mural.name));

    return {
      message: `Mural "${mural.name}" has been successfully deleted`,
    };
  }

  private async findMuralByName(
    muralName: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    if (manager) {
      const mural = await manager.findOne(MuralEntity, {
        where: { name: muralName },
      });
      return !!mural;
    }

    const mural = await this.muralsRepository.findOneBy({ name: muralName });
    return !!mural;
  }

  private async checkMuralNameAvailability(
    muralName: string,
    manager?: EntityManager,
  ): Promise<void> {
    // Dentro de uma transação o cache pode estar defasado: vai direto ao banco.
    if (!manager) {
      const cached = await this.cacheService.get<boolean>(
        this.MURAL_NAME_CACHE_KEY(muralName),
      );

      if (cached !== undefined) {
        if (cached) {
          throw new BadRequestException(
            `Mural with name "${muralName}" already exists`,
          );
        }
        return;
      }
    }

    const exists = await this.findMuralByName(muralName, manager);

    if (!manager) {
      await this.cacheService.set(
        this.MURAL_NAME_CACHE_KEY(muralName),
        exists,
        this.NAME_CACHE_TTL,
      );
    }

    if (exists) {
      throw new BadRequestException(
        `Mural with name "${muralName}" already exists`,
      );
    }
  }

  /**
   * Deriva um nome de mural livre a partir de uma base (ex.: local-part do e-mail).
   * Usado no registro para não falhar quando o nome base já está em uso.
   */
  async resolveAvailableMuralName(
    baseName: string,
    manager?: EntityManager,
  ): Promise<string> {
    const sanitized = (baseName ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const base = sanitized || 'mural';

    if (!(await this.findMuralByName(base, manager))) {
      return base;
    }

    for (let suffix = 2; suffix <= 100; suffix++) {
      const candidate = `${base}-${suffix}`;
      if (!(await this.findMuralByName(candidate, manager))) {
        return candidate;
      }
    }

    return `${base}-${Date.now().toString(36)}`;
  }

  async findOrFail(
    identifier: string,
    selectFields?: string[],
  ): Promise<MuralEntity> {
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        identifier,
      );

    const whereCondition = isUUID ? { id: identifier } : { name: identifier };

    let mural: MuralEntity | null;

    if (selectFields) {
      mural = await this.muralsRepository.findOne({
        where: whereCondition as FindOptionsWhere<MuralEntity>,
        select: selectFields as (keyof MuralEntity)[],
      });
    } else {
      mural = await this.muralsRepository.findOneBy(
        whereCondition as FindOptionsWhere<MuralEntity>,
      );
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
      config: createCallToActionDto.config,
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
      config: createdCallToAction.config,
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

    if (updateCallToActionDto.config !== undefined) {
      const callToActionUpdateData: Partial<CallToActionEntity> = {
        config: updateCallToActionDto.config,
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
      config: callToAction.config,
    };
  }

  async createAppearance(
    muralId: string,
    createAppearanceDto?: CreateMuralAppearanceDto,
  ): Promise<MuralAppearanceDto> {
    const mural = await this.muralsRepository.findOne({
      where: { id: muralId },
    });

    if (!mural) {
      throw new NotFoundException(`Mural com ID ${muralId} não encontrado`);
    }

    const existingAppearance = await this.appearanceRepository.findOne({
      where: { muralId },
    });

    if (existingAppearance) {
      throw new BadRequestException(
        `Mural já possui uma configuração de aparência`,
      );
    }

    const appearance = this.appearanceRepository.create({
      muralId,
      ...(createAppearanceDto || {}),
    });

    const savedAppearance = await this.appearanceRepository.save(appearance);

    return {
      id: savedAppearance.id,
      profileImageUrl: savedAppearance.profileImageUrl,
      coverImageUrl: savedAppearance.coverImageUrl,
      themeConfig: savedAppearance.themeConfig,
    };
  }

  async updateAppearance(
    muralId: string,
    updateAppearanceDto: UpdateMuralAppearanceDto,
  ): Promise<MuralAppearanceDto> {
    const appearance = await this.appearanceRepository.findOne({
      where: { muralId },
    });

    if (!appearance) {
      throw new NotFoundException(
        `Configuração de aparência não encontrada para o mural`,
      );
    }

    await this.appearanceRepository.update(
      { id: appearance.id },
      updateAppearanceDto,
    );

    const updatedAppearance = await this.appearanceRepository.findOneOrFail({
      where: { id: appearance.id },
    });

    // Invalidate cache
    const mural = await this.muralsRepository.findOne({
      where: { id: muralId },
    });
    if (mural) {
      await this.cacheService.del(this.MURAL_CACHE_KEY(mural.name, true));
      await this.cacheService.del(this.MURAL_CACHE_KEY(mural.name, false));
    }

    return {
      id: updatedAppearance.id,
      profileImageUrl: updatedAppearance.profileImageUrl,
      coverImageUrl: updatedAppearance.coverImageUrl,
      themeConfig: updatedAppearance.themeConfig,
    };
  }

  async submitFormResponse(
    callToActionId: string,
    data: Record<string, any>,
    submitterIp?: string,
  ): Promise<FormSubmissionEntity> {
    const cta = await this.callToActionsRepository.findOne({
      where: { id: callToActionId },
    });

    if (!cta) {
      throw new NotFoundException(
        `CTA com ID ${callToActionId} não encontrado`,
      );
    }

    if (cta.config.type !== 'form') {
      throw new BadRequestException('Este CTA não é do tipo formulário');
    }

    const submission = this.formSubmissionsRepository.create({
      callToActionId,
      data,
      submitterIp,
    });

    return this.formSubmissionsRepository.save(submission);
  }
}
