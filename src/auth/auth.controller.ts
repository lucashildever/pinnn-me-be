import { Body, Controller, Post, Get, UseGuards, Req } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from './guards/jwt-auth-guard';
import { AuthService } from './auth.service';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto, ValidateResponseDto } from './dto/auth-response.dto';
import { AuthRequest } from 'src/common/interfaces/auth-request.interface';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 tentativas por minuto
  @Post('register')
  async register(
    @Body() authCredentialsDto: AuthCredentialsDto,
  ): Promise<AuthResponseDto> {
    return this.authService.register(authCredentialsDto);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 tentativas por minuto
  @Post('login')
  async login(
    @Body() authCredentialsDto: AuthCredentialsDto,
  ): Promise<AuthResponseDto> {
    return this.authService.login(authCredentialsDto);
  }

  @Post('refresh')
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthResponseDto> {
    return this.authService.refreshTokens(refreshTokenDto.refresh_token);
  }

  @Post('logout')
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<{ message: string }> {
    return this.authService.logout(refreshTokenDto.refresh_token);
  }

  @UseGuards(JwtAuthGuard)
  @Get('validate')
  async validate(@Req() req: AuthRequest): Promise<ValidateResponseDto> {
    return this.authService.getValidatedUser(req.user.id);
  }
}
