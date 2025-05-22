import { Module } from '@nestjs/common';
import { MuralService } from './mural.service';
import { MuralController } from './mural.controller';

import { TypeOrmModule } from '@nestjs/typeorm';
import { Mural } from './entities/mural.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Mural])],
  controllers: [MuralController],
  providers: [MuralService],
})
export class MuralModule {}
