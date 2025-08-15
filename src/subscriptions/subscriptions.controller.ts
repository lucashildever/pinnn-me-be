import {
  Put,
  Get,
  Body,
  Post,
  Patch,
  Param,
  Query,
  HttpCode,
  UseGuards,
  HttpStatus,
  Controller,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';

import { SubscriptionsService } from './subscriptions.service';

import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async createSubscription(@Body() createDto: CreateSubscriptionDto) {
    return await this.subscriptionsService.createSubscription(createDto);
  }

  @Get('user/:userId')
  async getUserSubscriptions(@Param('userId') userId: string) {
    return this.subscriptionsService.findUserSubscriptions(userId);
  }

  @Get('user/:userId/active')
  async getUserActiveSubscription(@Param('userId') userId: string) {
    return await this.subscriptionsService.findUserActiveSubscription(userId);
  }

  @Get('user/:userId/status')
  async getUserSubscriptionStatus(@Param('userId') userId: string) {
    return await this.subscriptionsService.getSubscriptionStats(userId);
  }

  @Get('user/:userId/access/pro')
  async checkProAccess(@Param('userId') userId: string) {
    const hasProAccess = await this.subscriptionsService.hasProAccess(userId);
    const planType = await this.subscriptionsService.getUserPlanType(userId);

    return {
      hasProAccess,
      planType,
      isProUser: hasProAccess,
    };
  }

  @Post('user/:userId/validate-pro')
  @HttpCode(HttpStatus.OK)
  async validateProAccess(@Param('userId') userId: string) {
    await this.subscriptionsService.validateProAccess(userId);
    return 'Usuário possui acesso PRO válido';
  }

  @Get(':id')
  async getSubscriptionById(@Param('id') id: string) {
    return await this.subscriptionsService.findSubscriptionById(id);
  }

  @Get('billing/:billingProviderId')
  async getSubscriptionByBillingId(
    @Param('billingProviderId') billingProviderId: string,
  ) {
    return await this.subscriptionsService.findByBillingProviderId(
      billingProviderId,
    );
  }

  @Put(':id')
  async updateSubscription(
    @Param('id') id: string,
    @Body() updateDto: UpdateSubscriptionDto,
  ) {
    return await this.subscriptionsService.updateSubscription(id, updateDto);
  }

  @Patch(':id/activate')
  @HttpCode(HttpStatus.OK)
  async activateSubscription(
    @Param('id') id: string,
    @Body() body?: { periodEnd?: string },
  ) {
    const periodEnd = body?.periodEnd ? new Date(body.periodEnd) : undefined;
    return await this.subscriptionsService.activateSubscription(id, periodEnd);
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(@Param('id') id: string) {
    return await this.subscriptionsService.cancelSubscription(id);
  }

  @Patch(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  async reactivateSubscription(@Param('id') id: string) {
    return await this.subscriptionsService.reactivateSubscription(id);
  }

  @Patch(':id/renew')
  @HttpCode(HttpStatus.OK)
  async renewSubscription(
    @Param('id') id: string,
    @Body() body?: { periodInMonths?: number },
  ) {
    const periodInMonths = body?.periodInMonths || 1;
    return await this.subscriptionsService.renewSubscription(
      id,
      periodInMonths,
    );
  }

  @Get('expiring/check')
  async getExpiringSubscriptions(@Query('days') days?: string) {
    const daysNumber = days ? parseInt(days, 10) : 7;
    return await this.subscriptionsService.getSubscriptionsExpiringSoon(
      daysNumber,
    );
  }

  @Post('process-expired')
  @HttpCode(HttpStatus.OK)
  async processExpiredSubscriptions() {
    return await this.subscriptionsService.processExpiredSubscriptions();
  }
}
