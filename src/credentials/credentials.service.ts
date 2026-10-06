import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CredentialsService {
  async validatePassword(plaintext: string, hash: string): Promise<void> {
    const isValid = await bcrypt.compare(plaintext, hash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid password');
    }
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt);
  }
}
