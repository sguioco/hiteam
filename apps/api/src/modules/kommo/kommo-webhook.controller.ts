import { Body, Controller, HttpCode, Post, Query, UnauthorizedException } from '@nestjs/common';
import { KommoService } from './kommo.service';

@Controller('kommo/webhook')
export class KommoWebhookController {
  constructor(private readonly kommoService: KommoService) {}

  @Post()
  @HttpCode(200)
  handle(@Body() body: unknown, @Query('secret') secret?: string) {
    if (!this.kommoService.isWebhookSecretValid(secret)) {
      throw new UnauthorizedException('Invalid Kommo webhook secret.');
    }

    return this.kommoService.handleIncomingWebhook(body);
  }
}
