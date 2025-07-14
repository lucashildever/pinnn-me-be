import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { CredentialsService } from 'src/credentials/credentials.service';
import { UsersService } from 'src/users/users.service';

import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private readonly userService: UsersService,
    private readonly credentialService: CredentialsService,
  ) {}

  async register({
    email,
    password,
  }: AuthCredentialsDto): Promise<AuthResponseDto> {
    await this.userService.validateEmailDoesNotExist(email);

    const user = await this.userService.create({
      email: email,
      username: email.split('@')[0],
      password: await this.credentialService.hashPassword(password),
    });

    const tokenPayload = { sub: user.id, email: user.email };

    return {
      access_token: this.jwtService.sign(tokenPayload),
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    };
  }

  async login({
    email,
    password,
  }: AuthCredentialsDto): Promise<AuthResponseDto> {
    const user = await this.userService.findOrFail(email, true, [
      'id',
      'username',
      'email',
      'password',
    ]);

    await this.credentialService.validatePassword(password, user.password);

    const tokenPayload = { email: user.email, sub: user.id };

    return {
      access_token: this.jwtService.sign(tokenPayload),
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    };
  }
}
