import { Module } from '@nestjs/common';
import { CredentialService } from './credential.service';

@Module({
  imports: [],
  providers: [CredentialService],
  exports: [CredentialService],
})
export class CredentialModule {}
