import { IsEnum, IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export enum StorageContext {
  PROFILE_IMAGE = 'profile-image',
  COVER_IMAGE = 'cover-image',
  PIN_IMAGE = 'pin-image',
  PIN_VIDEO = 'pin-video',
  PIN_FILE = 'pin-file',
}

export class PresignDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsInt()
  @Min(1)
  @Max(1024 * 1024 * 1024) // 1GB
  fileSize: number;

  @IsEnum(StorageContext)
  context: StorageContext;
}