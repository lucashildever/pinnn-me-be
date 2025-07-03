import { ConflictException } from '@nestjs/common';

export class EmailAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: 'Email already registered',
      error: 'EMAIL_ALREADY_EXISTS',
      statusCode: 409,
    });
  }
}
