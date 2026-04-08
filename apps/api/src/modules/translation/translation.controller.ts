import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TranslateTextsDto } from './dto/translate-texts.dto';
import { TranslationService } from './translation.service';

@UseGuards(JwtAuthGuard)
@Controller('translate')
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {}

  @Post()
  async translateTexts(@Body() dto: TranslateTextsDto) {
    return {
      translations: await this.translationService.translateTexts(
        dto.texts,
        dto.targetLocale,
      ),
    };
  }
}
