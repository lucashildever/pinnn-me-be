import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(email: string, password: string) {
    // Verificar se o email já existe
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new UnauthorizedException('Email already exists');
    }

    // Criar hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar novo usuário
    const newUser = this.userRepository.create({
      username: email.split('@')[0],
      password: hashedPassword,
      email,
    });

    // Salvar no banco
    const savedUser = await this.userRepository.save(newUser);

    // Gerar JWT token
    const payload = { email: savedUser.email, sub: savedUser.id };
    return {
      access_token: this.jwtService.sign(payload),
      user: savedUser,
    };
  }

  async login(email: string, password: string) {
    // Buscar usuário pelo email
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password', 'username'], // Especifica os campos que queremos retornar
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verificar senha
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Gerar JWT token
    const payload = { email: user.email, sub: user.id };

    const userResponse = {
      id: user.id,
      email: user.email,
      username: user.username,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: userResponse,
    };
  }
}
