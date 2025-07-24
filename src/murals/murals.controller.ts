import {
  Req,
  Put,
  Get,
  Body,
  Post,
  Query,
  Param,
  Delete,
  UseGuards,
  Controller,
  ParseBoolPipe,
  ParseUUIDPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';

import { UpdateMuralResponseDto } from './dto/update-mural-response.dto';
import { MuralResponseDto } from './dto/mural-response.dto';
import { UpdateMuralDto } from './dto/update-mural.dto';
import { DeleteMuralDto } from './dto/delete-mural.dto';
import { MuralDto } from './dto/mural.dto';

import { MuralsService } from './murals.service';

import { AuthRequest } from 'src/common/interfaces/auth-request.interface';

@Controller('murals')
export class MuralsController {
  constructor(private readonly muralsService: MuralsService) {}

  @Get(':muralName')
  getMural(
    @Param('muralName') muralName: string,
    @Query('getMainCollectionPins', new DefaultValuePipe(false), ParseBoolPipe)
    getMainCollectionPins: boolean,
  ): Promise<MuralResponseDto> {
    return this.muralsService.find(muralName, getMainCollectionPins, false);
  }

  @UseGuards(JwtAuthGuard)
  @Post('create')
  createMural(
    @Req() request: AuthRequest,
    @Body() muralDto: MuralDto,
  ): Promise<MuralResponseDto> {
    return this.muralsService.create(request.user.id, muralDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('delete/:muralId')
  deleteMural(
    @Param('muralId', new ParseUUIDPipe()) muralId: string,
    @Body() DeleteMuralDto: DeleteMuralDto,
  ): Promise<{ message: string }> {
    return this.muralsService.softDelete(muralId, DeleteMuralDto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('update/:muralId')
  async updateMural(
    @Param('muralId', new ParseUUIDPipe()) muralId: string,
    @Body() updateMuralDto: UpdateMuralDto,
  ): Promise<UpdateMuralResponseDto> {
    return await this.muralsService.update(muralId, updateMuralDto);
  }
}
