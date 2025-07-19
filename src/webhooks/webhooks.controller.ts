import {
  Controller,
  Post,
  Body,
  Headers,
  RawBodyRequest,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { Request } from 'express';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('stripe')
  async handleStripeWebhook(
    @Body() body: any,
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    try {
      if (!signature) {
        throw new BadRequestException('Stripe signature header missing');
      }

      const result = await this.webhooksService.handleStripeWebhook(
        req.rawBody || Buffer.from(JSON.stringify(body)),
        signature,
      );

      return result;
    } catch (error) {
      throw new BadRequestException(`Webhook error: ${error.message}`);
    }
  }
}
