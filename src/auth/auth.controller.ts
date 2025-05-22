import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() authCredentialsDto: AuthCredentialsDto) {
    return this.authService.register(
      authCredentialsDto.email,
      authCredentialsDto.password,
    );
  }

  @Post('login')
  async login(@Body() authCredentialsDto: AuthCredentialsDto) {
    return this.authService.login(
      authCredentialsDto.email,
      authCredentialsDto.password,
    );
  }
}
