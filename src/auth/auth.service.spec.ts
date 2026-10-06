import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { CredentialsService } from '../credentials/credentials.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { MuralsService } from '../murals/murals.service';
import { DataSource } from 'typeorm';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { RefreshToken } from './entities/refresh-token.entity';

describe('AuthService', () => {
  let service: AuthService;

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockUsersService = {
    validateEmailDoesNotExist: jest.fn(),
    create: jest.fn(),
    findOrFail: jest.fn(),
  };

  const mockCredentialsService = {
    hashPassword: jest.fn(),
    validatePassword: jest.fn(),
  };

  const mockSubscriptionsService = {
    subscribeToDefault: jest.fn(),
    getAuthSubscription: jest.fn(),
  };

  const mockMuralsService = {
    create: jest.fn(),
    resolveAvailableMuralName: jest.fn(),
  };

  const mockRefreshTokenRepository = {
    save: jest.fn(),
    findOne: jest.fn(),
  };

  // Transaction manager exposes save() so register() can persist the refresh token
  const mockDataSource = {
    transaction: jest.fn((cb) => cb({ save: jest.fn() } as any)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: CredentialsService, useValue: mockCredentialsService },
        { provide: SubscriptionsService, useValue: mockSubscriptionsService },
        { provide: MuralsService, useValue: mockMuralsService },
        { provide: DataSource, useValue: mockDataSource },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a user and subscribe them to the default plan', async () => {
      const authCredentialsDto: AuthCredentialsDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const hashedPassword = 'hashedPassword';
      const createdUser = {
        id: 'user-id',
        email: 'test@example.com',
        username: 'test',
        password: hashedPassword,
      };

      const accessToken = 'jwt-token';

      const defaultMural = { id: 'mural-id' };

      const subscriptionProfile = {
        planType: 'free' as const,
        limits: { pins_per_group: 4 },
        features: ['Verified badge'],
      };

      mockUsersService.validateEmailDoesNotExist.mockResolvedValue(undefined);
      mockCredentialsService.hashPassword.mockResolvedValue(hashedPassword);
      mockUsersService.create.mockResolvedValue(createdUser);
      mockSubscriptionsService.subscribeToDefault.mockResolvedValue(undefined);
      mockMuralsService.resolveAvailableMuralName.mockResolvedValue('test');
      mockMuralsService.create.mockResolvedValue(defaultMural);
      mockSubscriptionsService.getAuthSubscription.mockResolvedValue(
        subscriptionProfile,
      );
      mockJwtService.sign.mockReturnValue(accessToken);

      const result = await service.register(authCredentialsDto);

      expect(mockUsersService.validateEmailDoesNotExist).toHaveBeenCalledWith(
        authCredentialsDto.email,
      );
      expect(mockCredentialsService.hashPassword).toHaveBeenCalledWith(
        authCredentialsDto.password,
      );
      expect(mockUsersService.create).toHaveBeenCalledWith(
        {
          email: authCredentialsDto.email,
          username: 'test',
          password: hashedPassword,
        },
        expect.anything(), // Transaction manager
      );
      expect(mockSubscriptionsService.subscribeToDefault).toHaveBeenCalledWith(
        createdUser.id,
        expect.anything(),
      );
      expect(mockMuralsService.resolveAvailableMuralName).toHaveBeenCalledWith(
        'test',
        expect.anything(),
      );
      expect(mockMuralsService.create).toHaveBeenCalledWith(
        createdUser.id,
        { name: 'test', displayName: "test's Mural" },
        expect.anything(),
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: createdUser.id,
        email: createdUser.email,
      });
      expect(result).toEqual({
        access_token: accessToken,
        refresh_token: expect.any(String),
        user: {
          id: createdUser.id,
          email: createdUser.email,
          username: createdUser.username,
          activeMuralId: defaultMural.id,
        },
        subscription: subscriptionProfile,
      });
    });
  });
});
