import { Controller, Post, UseGuards, Get, Param, Body } from '@nestjs/common';

import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { SuperAdminGuard } from 'src/auth/guards/super-admin.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';

import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';

import { PlanResponseDto } from './dto/plan-response.dto';
import { CreatePlanDto } from './dto/create-plan.dto';

import { PlansService } from './plans.service';

@Controller('admin/plans')
@ApiTags('Admin Plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiOperation({ summary: 'Create a new plan (Super Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Plan created successfully',
    type: PlanResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Super Admin access required',
  })
  async createPlan(
    @Body() createPlanDto: CreatePlanDto,
  ): Promise<PlanResponseDto> {
    return await this.plansService.createPlan(createPlanDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all plans (Admin access)' })
  @ApiResponse({
    status: 200,
    description: 'Plans retrieved successfully',
    type: [PlanResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  async getAllPlans(): Promise<PlanResponseDto[]> {
    return await this.plansService.findAllPlans(false);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get plan by ID (Admin access)' })
  @ApiParam({ name: 'id', description: 'Plan ID' })
  @ApiResponse({
    status: 200,
    description: 'Plan retrieved successfully',
    type: PlanResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async getPlanById(@Param('id') id: string): Promise<PlanResponseDto> {
    return await this.plansService.findPlanById(id, false);
  }

  @Get('slug/:slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get plan by slug (Admin access)' })
  @ApiParam({ name: 'slug', description: 'Plan slug' })
  @ApiResponse({
    status: 200,
    description: 'Plan retrieved successfully',
    type: PlanResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async getPlanBySlug(@Param('slug') slug: string): Promise<PlanResponseDto> {
    return await this.plansService.findPlanBySlug(slug, false);
  }
}

@Controller('plans')
@ApiTags('Public Plans')
export class PublicPlanController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  @ApiOperation({ summary: 'Get all public plans' })
  @ApiResponse({
    status: 200,
    description: 'Public plans retrieved successfully',
    type: [PlanResponseDto],
  })
  async getPublicPlans(): Promise<PlanResponseDto[]> {
    return await this.plansService.findAllPlans(true);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get public plan by slug' })
  @ApiParam({ name: 'slug', description: 'Plan slug' })
  @ApiResponse({
    status: 200,
    description: 'Public plan retrieved successfully',
    type: PlanResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async getPublicPlanBySlug(
    @Param('slug') slug: string,
  ): Promise<PlanResponseDto> {
    return await this.plansService.findPlanBySlug(slug, true);
  }
}
