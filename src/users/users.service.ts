import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { CredentialsService } from 'src/credentials/credentials.service';
import { CacheService } from 'src/cache/cache.service';

import { CreateUserResponseDto } from './dto/create-user-response.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { DeleteUserDto } from './dto/delete-user.dto';

import { EmailAlreadyExistsException } from '../auth/exceptions/email-already-exists.exception';

import { UserEntity } from './entities/user.entity';

import { Status } from 'src/common/enums/status.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,

    private readonly credentialsService: CredentialsService,
    private readonly cacheService: CacheService,

    private readonly dataSource: DataSource,
  ) {}

  private readonly USER_CACHE_KEY = (id: string) => `user:${id}`;
  private readonly EMAIL_CACHE_KEY = (email: string) => `user:email:${email}`;
  private readonly CACHE_TTL = 300;

  async find(id: string): Promise<UserResponseDto> {
    const cacheKey = this.USER_CACHE_KEY(id);
    const cachedUser = await this.cacheService.get<UserResponseDto>(cacheKey);

    if (cachedUser) {
      return cachedUser;
    }

    const user = await this.findOrFail(id);

    const murals = await this.dataSource
      .createQueryBuilder()
      .select([
        'murals.name as mural_name',
        'murals.displayName as mural_display_name',
        'murals.description as mural_description',
      ])
      .from('murals', 'murals')
      .where('murals.userId = :userId', { userId: id })
      .getRawMany();

    const response = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      murals: murals.map((mural) => ({
        name: mural.mural_name,
        displayName: mural.mural_display_name,
        description: mural.mural_description,
      })),
    };
    await this.cacheService.set(cacheKey, response, this.CACHE_TTL);
    return response;
  }

  async create(createUserDto: CreateUserDto): Promise<CreateUserResponseDto> {
    const response: CreateUserResponseDto = await this.dataSource.transaction(
      async (manager) => {
        const existingUser = await this.usersRepository.findOne({
          where: { email: createUserDto.email },
        });

        if (existingUser) {
          await this.cacheService.del(this.USER_CACHE_KEY(existingUser.id));
        }

        await this.validateEmailDoesNotExist(createUserDto.email);

        const hashedPassword = await this.credentialsService.hashPassword(
          createUserDto.password,
        );

        const user = manager.create(UserEntity, {
          ...createUserDto,
          password: hashedPassword,
        });

        const savedUser = await manager.save(UserEntity, user);

        return {
          id: savedUser.id,
          username: savedUser.username,
          email: savedUser.email,
        };
      },
    );
    return response;
  }

  async update(
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.findOrFail(userId);

    if (updateUserDto.email) {
      const emailExists = await this.checkIfEmailExists(updateUserDto.email);
      if (emailExists && user.email !== updateUserDto.email) {
        throw new EmailAlreadyExistsException();
      }
    }

    Object.assign(user, updateUserDto);

    const savedUser = await this.usersRepository.save(user);

    const response = {
      id: savedUser.id,
      email: savedUser.email,
      username: savedUser.username,
      role: savedUser.role,
    };

    await this.cacheService.del(this.USER_CACHE_KEY(userId));

    return response;
  }

  async softDelete(
    userId: string,
    deleteUserDto: DeleteUserDto,
  ): Promise<{ message: string }> {
    const user = await this.findOrFail(userId, true, ['password', 'email']);

    if (user.status === Status.Deleted) {
      throw new BadRequestException('User is already deleted');
    }

    await this.credentialsService.validatePassword(
      deleteUserDto.password,
      user.password,
    );

    const result = await this.usersRepository.update(
      { id: userId },
      { status: Status.Deleted },
    );

    if (result.affected === 0) {
      throw new InternalServerErrorException('Failed to delete user');
    }

    await this.cacheService.del(this.USER_CACHE_KEY(userId));

    return {
      message: `User with email ${user.email} was successfully deleted`,
    };
  }

  async validateEmailDoesNotExist(email: string): Promise<void> {
    const exists = await this.checkIfEmailExists(email);
    if (exists) {
      throw new EmailAlreadyExistsException();
    }
  }

  async checkIfEmailExists(email: string): Promise<boolean> {
    const cacheKey = this.EMAIL_CACHE_KEY(email);
    const cached = await this.cacheService.get<boolean>(cacheKey);

    if (cached !== undefined) {
      return cached;
    }

    const user = await this.usersRepository.findOne({
      where: { email },
    });

    const exists = !!user;

    await this.cacheService.set(cacheKey, exists, this.CACHE_TTL / 5);

    return exists;
  }

  async findUserEmail(userId: string): Promise<string> {
    return (await this.findOrFail(userId, false, ['email'])).email;
  }

  async findOrFail(
    identifier: string,
    onlyActive: boolean = true,
    selectFields?: string[],
  ): Promise<UserEntity> {
    let user: UserEntity | null;

    const isEmail = identifier.includes('@');

    const whereCondition = {
      ...(isEmail ? { email: identifier } : { id: identifier }),
      ...(onlyActive ? { status: Status.Active } : {}),
    };

    if (selectFields) {
      user = await this.usersRepository.findOne({
        where: whereCondition,
        select: selectFields as (keyof UserEntity)[],
      });
    } else {
      user = await this.usersRepository.findOneBy(whereCondition);
    }

    if (!user) {
      throw new NotFoundException('User not found!');
    }

    return user;
  }
}
