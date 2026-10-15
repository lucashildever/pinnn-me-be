import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth-guard';
import { StorageService } from './storage.service';
import { PresignDto } from './dto/presign.dto';

type PresignedUrlResponse = {
  uploadUrl: string;
  publicUrl: string;
  fileKey: string;
};

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @UseGuards(JwtAuthGuard)
  @Post('presign')
  async getPresignedUrl(@Body() presignDto: PresignDto): Promise<PresignedUrlResponse> {
    return this.storageService.getPresignedUrl(presignDto);
  }
}