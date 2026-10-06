import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { randomBytes, createHash } from 'crypto';

import { CredentialsService } from 'src/credentials/credentials.service';
import { UsersService } from 'src/users/users.service';
import { SubscriptionsService } from 'src/subscriptions/subscriptions.service';
import { MuralsService } from 'src/murals/murals.service';
import { RefreshToken } from './entities/refresh-token.entity';

import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { AuthResponseDto, ValidateResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly credentialsService: CredentialsService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly muralsService: MuralsService,
    private readonly dataSource: DataSource,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
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
          password: password,
        },
        manager,
      );

      await this.subscriptionsService.subscribeToDefault(user.id, manager);

      const muralName = await this.muralsService.resolveAvailableMuralName(
        username,
        manager,
      );

      const defaultMural = await this.muralsService.create(
        user.id,
        {
          name: muralName,
          displayName: `${username}'s Mural`,
        },
        manager,
      );

      const tokenPayload = { sub: user.id, email: user.email };

      // Gerar access token
      const accessToken = this.jwtService.sign(tokenPayload);

      // Gerar refresh token
      const { token: refreshToken, hash: tokenHash } =
        this.generateRefreshToken();

      // Salvar refresh token no banco
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias

      await manager.save(RefreshToken, {
        tokenHash,
        user: { id: user.id },
        expiresAt,
        isRevoked: false,
      });

      const subscription = await this.subscriptionsService.getAuthSubscription(
        user.id,
        manager,
      );

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          activeMuralId: defaultMural.id,
        },
        subscription,
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

    // Gerar access token (15 min)
    const accessToken = this.jwtService.sign(tokenPayload);

    // Gerar refresh token (7 dias)
    const { token: refreshToken, hash: tokenHash } =
      this.generateRefreshToken();

    // Salvar refresh token no banco
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias

    await this.refreshTokenRepository.save({
      tokenHash,
      user: { id: user.id },
      expiresAt,
      isRevoked: false,
    });

    const subscription = await this.subscriptionsService.getAuthSubscription(
      user.id,
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        activeMuralId: user.activeMuralId!,
      },
      subscription,
    };
  }

  async getValidatedUser(userId: string): Promise<ValidateResponseDto> {
    const user = await this.usersService.findOrFail(userId, true, [
      'id',
      'username',
      'email',
      'activeMuralId',
    ]);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        activeMuralId: user.activeMuralId!,
      },
    };
  }

  /**
   * Gera um refresh token opaco e retorna o token e seu hash
   */
  private generateRefreshToken(): { token: string; hash: string } {
    const token = randomBytes(64).toString('hex');
    const hash = createHash('sha256').update(token).digest('hex');
    return { token, hash };
  }

  /**
   * Valida e renova tokens (rotação de refresh token)
   */
  async refreshTokens(refreshToken: string): Promise<AuthResponseDto> {
    // Hash do token recebido para buscar no banco
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

    // Buscar token no banco
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    // Validações
    if (!storedToken) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (storedToken.isRevoked) {
      throw new UnauthorizedException('Refresh token revogado');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expirado');
    }

    // Revogar o token usado (rotação - consumo único)
    storedToken.isRevoked = true;
    await this.refreshTokenRepository.save(storedToken);

    // Gerar novos tokens
    const user = storedToken.user;
    const tokenPayload = { email: user.email, sub: user.id };

    const accessToken = this.jwtService.sign(tokenPayload);

    // Gerar novo refresh token
    const { token: newRefreshToken, hash: newTokenHash } =
      this.generateRefreshToken();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias

    await this.refreshTokenRepository.save({
      tokenHash: newTokenHash,
      user: { id: user.id },
      expiresAt,
      isRevoked: false,
    });

    const subscription = await this.subscriptionsService.getAuthSubscription(
      user.id,
    );

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        activeMuralId: user.activeMuralId!,
      },
      subscription,
    };
  }

  /**
   * Revoga um refresh token (logout)
   */
  async logout(refreshToken: string): Promise<{ message: string }> {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

    const storedToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
    });

    if (storedToken && !storedToken.isRevoked) {
      storedToken.isRevoked = true;
      await this.refreshTokenRepository.save(storedToken);
    }

    return { message: 'Logout realizado com sucesso' };
  }
}
