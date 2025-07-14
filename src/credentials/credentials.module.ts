import { Module } from '@nestjs/common';
import { CredentialsService } from './credentials.service';

@Module({
  imports: [],
  providers: [CredentialsService],
  exports: [CredentialsService],
})
export class CredentialsModule {}
