import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CredentialsService {
  async validatePassword(plaintext: string, hash: string): Promise<void> {
    if (!bcrypt.compare(plaintext, hash)) {
      throw new UnauthorizedException('Invalid password');
    }
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(password, salt);
  }
}
