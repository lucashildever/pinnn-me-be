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
import { SessionStatusDto } from './dto/session-status.dto';

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
  ): Promise<SessionStatusDto> {
    const userId = req.user.id;
    return this.paymentsService.findSessionStatus(sessionId, userId);
  }

  @Post('create-customer-portal')
  @UseGuards(JwtAuthGuard)
  async createCustomerPortal(
    @Body() portalDto: CreateCustomerPortalDto,
    @Req() req: AuthRequest,
  ): Promise<{ url: string }> {
    const userId = req.user.id;
    return this.paymentsService.createCustomerPortal(
      userId,
      portalDto.returnUrl,
    );
  }
}
