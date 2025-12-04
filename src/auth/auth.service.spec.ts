import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { CredentialsService } from '../credentials/credentials.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { DataSource } from 'typeorm';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';

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
  };

  const mockDataSource = {
    transaction: jest.fn((cb) => cb({} as any)), // Mock transaction to execute callback immediately
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: CredentialsService, useValue: mockCredentialsService },
        { provide: SubscriptionsService, useValue: mockSubscriptionsService },
        { provide: DataSource, useValue: mockDataSource },
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

      mockUsersService.validateEmailDoesNotExist.mockResolvedValue(undefined);
      mockCredentialsService.hashPassword.mockResolvedValue(hashedPassword);
      mockUsersService.create.mockResolvedValue(createdUser);
      mockSubscriptionsService.subscribeToDefault.mockResolvedValue(undefined);
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
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: createdUser.id,
        email: createdUser.email,
      });
      expect(result).toEqual({
        access_token: accessToken,
        user: {
          id: createdUser.id,
          email: createdUser.email,
          username: createdUser.username,
        },
      });
    });
  });
});
