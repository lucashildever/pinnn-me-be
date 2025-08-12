import { Controller, Post, UseGuards, Get, Param, Body } from '@nestjs/common';

import { SuperAdminGuard } from 'src/auth/guards/super-admin.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';

import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';

import { PlanResponseDto } from './dto/plan-response.dto';
import { CreatePlanDto } from './dto/create-plan.dto';

import { PlansService } from './plans.service';

import { Plan } from './entities/plan.entity';

@Controller('admin/plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async createPlan(
    @Body() createPlanDto: CreatePlanDto,
  ): Promise<PlanResponseDto> {
    return await this.plansService.createPlan(createPlanDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async getAllPlans(): Promise<PlanResponseDto[]> {
    return await this.plansService.findAllPlans(false);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async getPlanById(@Param('id') id: string): Promise<PlanResponseDto> {
    return await this.plansService.findPlanById(id, false);
  }

  @Get('slug/:slug')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async getPlanBySlug(@Param('slug') slug: string): Promise<PlanResponseDto> {
    return await this.plansService.findPlanBySlug(slug, false);
  }
}

@Controller('plans')
export class PublicPlanController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  async getPublicPlans(): Promise<PlanResponseDto[]> {
    return await this.plansService.findAllPlans(true);
  }

  @Get('slug/:slug')
  async getPublicPlanBySlug(
    @Param('slug') slug: string,
  ): Promise<PlanResponseDto> {
    return await this.plansService.findPlanBySlug(slug, true);
  }
}
