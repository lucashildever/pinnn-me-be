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

import { MuralService } from './mural.service';

import { AuthRequest } from 'src/common/interfaces/auth-request.interface';

@Controller('mural')
export class MuralController {
  constructor(private readonly muralService: MuralService) {}

  @Get(':muralName')
  getMural(
    @Param('muralName') muralName: string,
    @Query(
      'get-main-collection-pins',
      new DefaultValuePipe(false),
      ParseBoolPipe,
    )
    getMainCollectionPins: boolean,
  ): Promise<MuralResponseDto> {
    return this.muralService.find(muralName, getMainCollectionPins, false);
  }

  @UseGuards(JwtAuthGuard)
  @Post('create')
  createMural(
    @Req() request: AuthRequest,
    @Body() muralDto: MuralDto,
  ): Promise<MuralResponseDto> {
    return this.muralService.create(request.user.id, muralDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('delete/:muralId')
  deleteMural(
    @Param('muralId', new ParseUUIDPipe()) muralId: string,
    @Body() DeleteMuralDto: DeleteMuralDto,
  ): Promise<{ message: string }> {
    return this.muralService.softDelete(muralId, DeleteMuralDto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('update/:muralId')
  async updateMural(
    @Param('muralId', new ParseUUIDPipe()) muralId: string,
    @Body() updateMuralDto: UpdateMuralDto,
  ): Promise<UpdateMuralResponseDto> {
    return await this.muralService.update(muralId, updateMuralDto);
  }
}
