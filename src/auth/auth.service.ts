import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';

import { CredentialsService } from 'src/credentials/credentials.service';
import { UsersService } from 'src/users/users.service';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';
import { MuralsService } from 'src/murals/murals.service';

import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly credentialsService: CredentialsService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly muralsService: MuralsService,
    private readonly dataSource: DataSource,
  ) {}

  async register({
    email,
    password,
  }: AuthCredentialsDto): Promise<AuthResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      await this.usersService.validateEmailDoesNotExist(email);

      const username = email.split('@')[0];

      const user = await this.usersService.create(
        {
          email: email,
          username: username,
          password: await this.credentialsService.hashPassword(password),
        },
        manager,
      );

      await this.subscriptionsService.subscribeToDefault(user.id, manager);

      const defaultMural = await this.muralsService.create(user.id, {
        name: username.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        displayName: `${username}'s Mural`,
      });

      const tokenPayload = { sub: user.id, email: user.email };

      return {
        access_token: this.jwtService.sign(tokenPayload),
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          activeMuralId: defaultMural.id,
        },
      };
    });
  }

  async login({
    email,
    password,
  }: AuthCredentialsDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findOrFail(email, true, [
      'id',
      'username',
      'email',
      'password',
      'activeMuralId',
    ]);

    await this.credentialsService.validatePassword(password, user.password);

    const tokenPayload = { email: user.email, sub: user.id };

    return {
      access_token: this.jwtService.sign(tokenPayload),
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        activeMuralId: user.activeMuralId,
      },
    };
  }
}
