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
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    try {
      await this.webhooksService.handleStripeWebhook(
        req.rawBody || Buffer.from(JSON.stringify(body)),
        signature,
      );

      return { received: true };
    } catch (error) {
      console.error('Webhook processing failed:', error);
      throw new BadRequestException('Webhook processing failed');
    }
  }
}
