import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import type { AccessPayload } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateQuoteDto } from './dto';
import { QuotesService } from './quotes.service';

@Controller('quotes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('customer')
export class QuotesController {
  constructor(@Inject(QuotesService) private readonly quotes: QuotesService) {}

  @Post()
  create(@CurrentUser() user: AccessPayload, @Body() body: CreateQuoteDto) {
    return this.quotes.create(user, body);
  }
}
