import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateMuralDto } from './dto/create-mural.dto';
import { MuralDto } from './dto/mural.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Mural } from './entities/mural.entity';
import { Repository } from 'typeorm';

@Injectable()
export class MuralService {
  constructor(
    @InjectRepository(Mural)
    private readonly muralRepository: Repository<Mural>,
  ) {}

  async find(muralName: string): Promise<MuralDto> {
    if (!muralName) {
      throw new BadRequestException('Mural name is required');
    }

    const mural = await this.muralRepository.findOne({
      where: { name: muralName },
      select: ['name', 'description'], // Explicitly select fields
    });

    if (!mural) {
      throw new NotFoundException(`Mural with name "${muralName}" not found`);
    }

    return {
      id: mural.id,
      name: mural.name,
      description: mural.description,
    };
  }

  async create(
    createMuralDto: CreateMuralDto,
    userId: number,
  ): Promise<MuralDto> {
    const mural = this.muralRepository.create({
      ...createMuralDto,
      user_id: userId,
    });

    return this.muralRepository.save(mural);
  }

  async update(
    muralName: string,
    updateMuralDto: CreateMuralDto,
  ): Promise<MuralDto> {
    const mural = await this.muralRepository.findOneBy({ name: muralName });
    if (!mural) throw new NotFoundException('Mural not found!');
    await this.muralRepository.update({ name: muralName }, updateMuralDto);
    const updatedMural = await this.muralRepository.findOneBy({
      name: muralName,
    });
    return {
      id: updatedMural!.id,
      name: updatedMural!.name,
      description: updatedMural!.description,
    };
  }

  async remove(muralName: string): Promise<void> {
    const result = await this.muralRepository.delete({ name: muralName });
    if (result.affected === 0)
      throw new NotFoundException('Mural não encontrado');
  }
}
