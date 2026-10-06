import { UnauthorizedException } from '@nestjs/common';
import { CredentialsService } from './credentials.service';

describe('CredentialsService', () => {
  let service: CredentialsService;

  beforeEach(() => {
    service = new CredentialsService();
  });

  describe('validatePassword', () => {
    it('resolves when the password matches the hash', async () => {
      const hash = await service.hashPassword('correct-horse');

      await expect(
        service.validatePassword('correct-horse', hash),
      ).resolves.toBeUndefined();
    });

    it('throws UnauthorizedException when the password does not match', async () => {
      const hash = await service.hashPassword('correct-horse');

      await expect(
        service.validatePassword('wrong-password', hash),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
