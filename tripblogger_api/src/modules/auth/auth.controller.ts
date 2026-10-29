import { Body, Controller, ForbiddenException, Get, Headers, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { GuestDto } from './dto/guest.dto';
import { BanGuestDto } from './dto/ban-guest.dto';
import { GoogleDto } from './dto/google.dto';
import { AUTH_THROTTLE } from '../../config/http-security';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle(AUTH_THROTTLE)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Throttle(AUTH_THROTTLE)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken, dto.deviceId);
  }

  @Post('logout')
  logout(@Body() dto: RefreshDto) {
    return this.authService.logout(dto.refreshToken, dto.deviceId);
  }

  @Post('guest')
  guest(@Body() dto: GuestDto) {
    return this.authService.guest(dto.sessionId, dto.deviceId);
  }

  @Post('guest/ban')
  banGuest(@Headers('x-admin-secret') adminSecret: string | undefined, @Body() dto: BanGuestDto) {
    const expected = process.env.ADMIN_SECRET;
    if (!expected || !adminSecret || adminSecret !== expected) throw new ForbiddenException('Unauthorized');
    return this.authService.banGuest(dto.sessionId, dto.reason);
  }

  @Post('google')
  @Throttle(AUTH_THROTTLE)
  google(@Body() dto: GoogleDto) {
    return this.authService.googleLogin(dto.idToken, dto.deviceId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: { user: { sub: string } }) {
    return this.authService.me(req.user.sub);
  }
}
