import {
  Req,
  Get,
  Put,
  Body,
  Post,
  Param,
  Delete,
  UseGuards,
  Controller,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';

import { ValidateEmailDto } from './dto/validate-email.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { DeleteUserDto } from './dto/delete-user.dto';

import { UserService } from './user.service';
import { AuthRequest } from 'src/common/interfaces/auth-request.interface';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getUser(@Req() request: AuthRequest): Promise<UserResponseDto> {
    return this.userService.find(request.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('update')
  async updateUser(
    @Req() request: AuthRequest,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.userService.update(request.user.id, updateUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('delete')
  async deleteUser(
    @Req() request: AuthRequest,
    @Body() deleteUserDto: DeleteUserDto,
  ): Promise<{ message: string }> {
    return this.userService.softDelete(request.user.id, deleteUserDto);
  }

  @Post('validate-email')
  async validateEmail(
    @Body() validateEmailDto: ValidateEmailDto,
  ): Promise<{ available: boolean }> {
    const exists = await this.userService.checkIfEmailExists(
      validateEmailDto.email,
    );
    return { available: !exists };
  }
}
