import {
  Get,
  Post,
  Param,
  HttpCode,
  UseGuards,
  HttpStatus,
  Controller,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

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
    const planType = await this.subscriptionsService.findUserPlanType(userId);

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
}
