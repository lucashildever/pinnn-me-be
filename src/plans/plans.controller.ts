import { Controller, Post, UseGuards, Get, Param, Body } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'src/auth/enums/role.enum';

import { CreatePlanDto } from './dto/create-plan.dto';
import { PlansService } from './plans.service';
import { Plan } from './entities/plan.entity';

@Controller('admin/plans')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlansController {
  constructor(private readonly planService: PlansService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN)
  async createPlan(@Body() createPlanDto: CreatePlanDto): Promise<Plan> {
    return await this.planService.createPlan(createPlanDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async getAllPlans(): Promise<Plan[]> {
    return await this.planService.findAllPlans();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async getPlanById(@Param('id') id: string): Promise<Plan> {
    return await this.planService.findPlanById(id);
  }

  @Get('slug/:slug')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async getPlanBySlug(@Param('slug') slug: string): Promise<Plan> {
    return await this.planService.findPlanBySlug(slug);
  }
}

@Controller('plans')
export class PublicPlanController {
  constructor(private readonly planService: PlansService) {}

  @Get()
  async getPublicPlans(): Promise<Plan[]> {
    return await this.planService.findAllPlans();
  }

  @Get('slug/:slug')
  async getPublicPlanBySlug(@Param('slug') slug: string): Promise<Plan> {
    return await this.planService.findPlanBySlug(slug);
  }
}
