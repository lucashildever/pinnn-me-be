import { Controller, Post, UseGuards, Get, Param, Body } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';

import { CreatePlanDto } from './dto/create-plan.dto';
import { PlansService } from './plans.service';
import { Plan } from './entities/plan.entity';
import { SuperAdminGuard } from 'src/auth/guards/super-admin.guard';

@Controller('admin/plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async createPlan(@Body() createPlanDto: CreatePlanDto): Promise<Plan> {
    return await this.plansService.createPlan(createPlanDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async getAllPlans(): Promise<Plan[]> {
    return await this.plansService.findAllPlans();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async getPlanById(@Param('id') id: string): Promise<Plan> {
    return await this.plansService.findPlanById(id);
  }

  @Get('slug/:slug')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async getPlanBySlug(@Param('slug') slug: string): Promise<Plan> {
    return await this.plansService.findPlanBySlug(slug);
  }
}

@Controller('plans')
export class PublicPlanController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  async getPublicPlans(): Promise<Plan[]> {
    return await this.plansService.findAllPlans();
  }

  @Get('slug/:slug')
  async getPublicPlanBySlug(@Param('slug') slug: string): Promise<Plan> {
    return await this.plansService.findPlanBySlug(slug);
  }
}
