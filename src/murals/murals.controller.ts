import {
  Ip,
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
import { CreateFormSubmissionDto } from './dto/call-to-action/create-form-submission.dto';

import { CreateMuralAppearanceDto } from './dto/appearance/create-mural-appearance.dto';
import { UpdateMuralAppearanceDto } from './dto/appearance/update-mural-appearance.dto';
import { MuralAppearanceDto } from './dto/appearance/mural-appearance.dto';

import { MuralsService } from './murals.service';

import { AuthRequest } from 'src/common/interfaces/auth-request.interface';

@Controller('murals')
export class MuralsController {
  constructor(private readonly muralsService: MuralsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('user')
  getUserMurals(@Req() request: AuthRequest): Promise<{
    murals: {
      id: string;
      name: string;
      displayName: string;
      isActive: boolean;
    }[];
    activeMuralId: string;
  }> {
    return this.muralsService.findAllByUser(request.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('active/:muralId')
  setActiveMural(
    @Req() request: AuthRequest,
    @Param('muralId', new ParseUUIDPipe()) muralId: string,
  ): Promise<{ message: string; activeMuralId: string }> {
    return this.muralsService.setActiveMuralForUser(request.user.id, muralId);
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
    return this.muralsService.delete(muralId, DeleteMuralDto);
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

  @UseGuards(JwtAuthGuard)
  @Post('appearance/create/:muralId')
  async createMuralAppearance(
    @Param('muralId', new ParseUUIDPipe()) muralId: string,
    @Body() createAppearanceDto: CreateMuralAppearanceDto,
  ): Promise<MuralAppearanceDto> {
    return this.muralsService.createAppearance(muralId, createAppearanceDto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('appearance/update/:muralId')
  async updateMuralAppearance(
    @Param('muralId', new ParseUUIDPipe()) muralId: string,
    @Body() updateAppearanceDto: UpdateMuralAppearanceDto,
  ): Promise<MuralAppearanceDto> {
    return this.muralsService.updateAppearance(muralId, updateAppearanceDto);
  }

  @Get(':muralName')
  getMural(
    @Param('muralName') muralName: string,
    @Query(
      'getMainCollectionResources',
      new DefaultValuePipe(false),
      ParseBoolPipe,
    )
    getMainCollectionResources: boolean,
  ): Promise<MuralResponseDto> {
    return this.muralsService.find(muralName, getMainCollectionResources);
  }

  @Post('cta/:ctaId/submit')
  async submitFormResponse(
    @Param('ctaId', new ParseUUIDPipe()) ctaId: string,
    @Body() createFormSubmissionDto: CreateFormSubmissionDto,
    @Ip() ip: string,
  ) {
    return this.muralsService.submitFormResponse(
      ctaId,
      createFormSubmissionDto.data,
      ip,
    );
  }
}
