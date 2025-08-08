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

import { CreateCallToActionDto } from './dto/call-to-action/create-call-to-action.dto';
import { UpdateCallToActionDto } from './dto/call-to-action/update-call-to-action.dto';
import { CallToActionDto } from './dto/call-to-action/call-to-action.dto';

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

  @UseGuards(JwtAuthGuard)
  @Post('cta/create/:muralId')
  async createMuralCta(
    @Param('muralId', new ParseUUIDPipe()) muralId: string,
    @Body() createCallToActionDto: CreateCallToActionDto,
  ): Promise<CallToActionDto> {
    return this.muralsService.createCallToAction(
      muralId,
      createCallToActionDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('cta/update/:callToActionId')
  async updateMuralCta(
    @Param('callToActionId', new ParseUUIDPipe()) callToActionId: string,
    @Body() updateCallToActionDto: UpdateCallToActionDto,
  ): Promise<CallToActionDto> {
    return this.muralsService.updateCallToAction(
      callToActionId,
      updateCallToActionDto,
    );
  }
}
