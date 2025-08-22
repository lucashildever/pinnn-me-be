import {
  Req,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Controller,
} from '@nestjs/common';

import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { AuthRequest } from 'src/common/interfaces/auth-request.interface';

import { PaymentsService } from './payments.service';

import { CheckoutSessionResponseDto } from './dto/checkout-session-response.dto';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { CreateCustomerPortalDto } from './dto/create-customer-portal.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-checkout-session')
  @UseGuards(JwtAuthGuard)
  async createCheckoutSession(
    @Body() createSessionDto: CreateCheckoutSessionDto,
    @Req() req: AuthRequest,
  ): Promise<CheckoutSessionResponseDto> {
    return await this.paymentsService.createCheckoutSession(
      req.user.id,
      createSessionDto.planType,
      createSessionDto.period,
    );
  }

  @Get('session-status')
  @UseGuards(JwtAuthGuard)
  async getSessionStatus(
    @Query('session_id') sessionId: string,
    @Req() req: AuthRequest,
  ) {
    const userId = req.user.id;
    return this.paymentsService.getSessionStatus(sessionId, userId);
  }

  @Post('create-customer-portal')
  @UseGuards(JwtAuthGuard)
  async createCustomerPortal(
    @Body() portalDto: CreateCustomerPortalDto,
    @Req() req: AuthRequest,
  ) {
    const userId = req.user.id;
    return this.paymentsService.createCustomerPortal(
      userId,
      portalDto.returnUrl,
    );
  }

  @Get('subscription-status')
  @UseGuards(JwtAuthGuard)
  async getSubscriptionStatus(@Req() req: AuthRequest) {
    const userId = req.user.id;
    return this.paymentsService.getSubscriptionStatus(userId);
  }

  @Post('cancel-subscription')
  @UseGuards(JwtAuthGuard)
  async cancelSubscription(@Req() req: AuthRequest) {
    const userId = req.user.id;
    return this.paymentsService.cancelSubscription(userId);
  }

  @Post('reactivate-subscription')
  @UseGuards(JwtAuthGuard)
  async reactivateSubscription(@Req() req: AuthRequest) {
    const userId = req.user.id;
    return this.paymentsService.reactivateSubscription(userId);
  }

  @Get('invoices')
  @UseGuards(JwtAuthGuard)
  async getInvoices(@Req() req: AuthRequest) {
    const userId = req.user.id;
    return this.paymentsService.getCustomerInvoices(userId);
  }
}
