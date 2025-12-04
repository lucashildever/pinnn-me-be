import { Logger, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { VariantEntity } from './entities/variant.entity';
import { PinEntity } from './entities/pin.entity';

import { UpdatePinDto } from './dto/update-pin.dto';
import { PinDto } from './dto/pin.dto';

import { PaginationQueryDto } from 'src/common/dto/pagination/pagination-query.dto';
import { PaginatedPinsResponseDto } from './dto/pagination/paginated-pins-response.dto';
import { PaginatedVariantsResponseDto } from './dto/pagination/paginated-variants-response.dto';

@Injectable()
export class PinsService {
  private readonly logger = new Logger(PinsService.name);

  constructor(private readonly dataSource: DataSource) {}

  async update(pinId: string, updatePinDto: UpdatePinDto): Promise<PinDto> {
    return await this.dataSource.transaction(async (manager) => {
      const pinToUpdate = await manager
        .createQueryBuilder(PinEntity, 'pin')
        .leftJoinAndSelect('pin.variants', 'variants')
        .where('pin.id = :pinId', { pinId })
        .getOne();

      if (!pinToUpdate) {
        throw new NotFoundException(`Pin with ID ${pinId} not found`);
      }

      if (updatePinDto.variants && updatePinDto.variants.length > 0) {
        for (const variantUpdate of updatePinDto.variants) {
          const variantToUpdate = pinToUpdate.variants.find(
            (variant) => variant.id === variantUpdate.id,
          );

          if (!variantToUpdate) {
            throw new NotFoundException(
              `Variant with ID ${variantUpdate.id} not found in pin ${pinId}`,
            );
          }

          if (variantUpdate.config !== undefined) {
            variantToUpdate.config = variantUpdate.config;
            await manager.save(variantToUpdate);
          }
        }
      }

      const updatedPin = await manager
        .createQueryBuilder(PinEntity, 'pin')
        .leftJoinAndSelect('pin.variants', 'variants')
        .where('pin.id = :pinId', { pinId })
        .orderBy('variants.order', 'ASC')
        .getOne();

      if (!updatedPin) {
        throw new NotFoundException(`Updated pin with ID ${pinId} not found`);
      }

      return {
        id: updatedPin.id,
        order: updatedPin.order,
        variants: updatedPin.variants.map((variant) => ({
          id: variant.id,
          order: variant.order,
          config: variant.config,
        })),
      };
    });
  }

  async findPins(
    resourceId: string,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedPinsResponseDto> {
    const { page = 1, limit = 10 } = paginationQuery;
    const skip = (page - 1) * limit;

    const [pins, total] = await this.dataSource
      .getRepository(PinEntity)
      .findAndCount({
        where: { resourceId },
        order: { order: 'ASC' },
        skip,
        take: limit,
        relations: ['variants', 'pinMeta'],
      });

    return {
      pins: pins.map((pin) => ({
        id: pin.id,
        order: pin.order,
        meta: pin.pinMeta
          ? {
              sharedPinId: pin.pinMeta.sharedPinId,
              firstPinId: pin.pinMeta.firstPinId,
              history: pin.pinMeta.history,
            }
          : undefined,
        variants: pin.variants.map((v) => ({
          id: v.id,
          order: v.order,
          config: v.config,
        })),
      })),
      pagination: {
        currentPage: page,
        totalItems: total,
        itemsPerPage: limit,
      },
    };
  }

  async findVariants(
    pinId: string,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedVariantsResponseDto> {
    const { page = 1, limit = 10 } = paginationQuery;
    const skip = (page - 1) * limit;

    const [variants, total] = await this.dataSource
      .getRepository(VariantEntity)
      .findAndCount({
        where: { pinId },
        order: { order: 'ASC' },
        skip,
        take: limit,
      });

    return {
      variants: variants.map((v) => ({
        id: v.id,
        order: v.order,
        config: v.config,
      })),
      pagination: {
        currentPage: page,
        totalItems: total,
        itemsPerPage: limit,
      },
    };
  }

  async findBatchPreviews(
    resourceIds: string[],
    previewLimit: number = 4,
  ): Promise<Map<string, PinDto[]>> {
    if (resourceIds.length === 0) return new Map();

    const pinsRaw: any[] = await this.dataSource.query(
      `
      SELECT p.*, pm.id as pm_id, pm.shared_pin_id, pm.first_pin_id, pm.history
      FROM (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY \`resource_id\` ORDER BY \`order\` ASC) as rn
        FROM \`pins\`
        WHERE \`resource_id\` IN (${resourceIds.map((id) => `'${id}'`).join(',')})
      ) p
      LEFT JOIN \`pin_meta\` pm ON p.id = pm.pin_id
      WHERE p.rn <= ${previewLimit}
    `,
    );

    const pinIds = pinsRaw.map((p) => p.id);
    if (pinIds.length === 0) {
      return new Map(resourceIds.map((id) => [id, []]));
    }

    const variantsRaw: any[] = await this.dataSource.query(
      `
      SELECT * FROM (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY \`pin_id\` ORDER BY \`order\` ASC) as rn
        FROM \`variants\`
        WHERE \`pin_id\` IN (${pinIds.map((id) => `'${id}'`).join(',')})
      ) t
      WHERE rn <= ${previewLimit}
    `,
    );

    const variantsByPin = new Map<string, any[]>();
    variantsRaw.forEach((v) => {
      if (!variantsByPin.has(v.pin_id)) variantsByPin.set(v.pin_id, []);
      variantsByPin.get(v.pin_id)?.push({
        id: v.id,
        order: v.order,
        config: typeof v.config === 'string' ? JSON.parse(v.config) : v.config,
      });
    });

    const pinsByResource = new Map<string, PinDto[]>();
    pinsRaw.forEach((p) => {
      if (!pinsByResource.has(p.resource_id))
        pinsByResource.set(p.resource_id, []);
      pinsByResource.get(p.resource_id)?.push({
        id: p.id,
        order: p.order,
        meta: p.pm_id
          ? {
              sharedPinId: p.shared_pin_id,
              firstPinId: p.first_pin_id,
              history:
                typeof p.history === 'string'
                  ? JSON.parse(p.history)
                  : p.history || [],
            }
          : undefined,
        variants: variantsByPin.get(p.id) || [],
      });
    });

    return pinsByResource;
  }
}
