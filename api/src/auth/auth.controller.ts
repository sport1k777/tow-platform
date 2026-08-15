import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';

import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { LogoutDto, RefreshDto, RequestOtpDto, VerifyOtpDto } from './dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller()
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('auth/otp/request')
  requestOtp(@Body() body: RequestOtpDto) {
    return this.authService.requestOtp(body.phone);
  }

  @Post('auth/otp/verify')
  verifyOtp(@Body() body: VerifyOtpDto) {
    return this.authService.verifyOtp(body.phone, body.code);
  }

  @Post('auth/refresh')
  refresh(@Body() body: RefreshDto) {
    return this.authService.refresh(body.refreshToken);
  }

  @Post('auth/logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: { sub: string },
    @Body() body: LogoutDto,
  ) {
    await this.authService.logout(user.sub, body.refreshToken);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: { sub: string }) {
    return this.authService.me(user.sub);
  }
}
