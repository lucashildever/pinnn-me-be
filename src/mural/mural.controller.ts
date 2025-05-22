import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { MuralService } from './mural.service';
import { CreateMuralDto } from './dto/create-mural.dto';
import { MuralDto } from './dto/mural.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';

@Controller('mural')
export class MuralController {
  constructor(private readonly muralService: MuralService) {}

  @Get(':muralName')
  getMural(@Param('muralName') muralName: string): Promise<MuralDto> {
    return this.muralService.find(muralName);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  createMural(
    @Req() request,
    @Body() createMuralDto: CreateMuralDto,
  ): Promise<MuralDto> {
    return this.muralService.create(createMuralDto, request.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':muralName')
  deleteMural(@Param('muralName') muralName: string) {
    return this.muralService.remove(muralName);
  }
}
