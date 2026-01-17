import { Body, Controller, Post, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth-guard';
import { AuthService } from './auth.service';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { AuthResponseDto, ValidateResponseDto } from './dto/auth-response.dto';
import { AuthRequest } from 'src/common/interfaces/auth-request.interface';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(
    @Body() authCredentialsDto: AuthCredentialsDto,
  ): Promise<AuthResponseDto> {
    return this.authService.register(authCredentialsDto);
  }

  @Post('login')
  async login(
    @Body() authCredentialsDto: AuthCredentialsDto,
  ): Promise<AuthResponseDto> {
    return this.authService.login(authCredentialsDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('validate')
  async validate(@Req() req: AuthRequest): Promise<ValidateResponseDto> {
    return this.authService.getValidatedUser(req.user.id);
  }
}
