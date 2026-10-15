import { randomUUID } from 'crypto';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PresignDto, StorageContext } from './dto/presign.dto';

interface PresignedUrlResponse {
  uploadUrl: string;
  publicUrl: string;
  fileKey: string;
}

@Injectable()
export class StorageService {
  private s3Client: S3Client;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('storage.endpoint');
    const port = this.configService.get<number>('storage.port');
    const useSsl = this.configService.get<boolean>('storage.useSsl');
    const accessKey = this.configService.get<string>('storage.accessKey');
    const secretKey = this.configService.get<string>('storage.secretKey');
    const region = this.configService.get<string>('storage.region');

    const protocol = useSsl ? 'https' : 'http';
    const endpointHost = port ? `${endpoint}:${port}` : endpoint;
    const endpointUrl = `${protocol}://${endpointHost}`;

    this.s3Client = new S3Client({
      region: region ?? 'us-east-1',
      endpoint: endpointUrl,
      forcePathStyle: true,
      credentials:
        accessKey && secretKey
          ? { accessKeyId: accessKey, secretAccessKey: secretKey }
          : undefined,
    });
  }

  private getBucketAndCdnForContext(context: StorageContext): {
    bucket: string;
    cdnUrl: string | undefined;
  } {
    const buckets = this.configService.get('storage.buckets') as {
      images: string;
      videos: string;
      files: string;
    };
    const cdn = this.configService.get('storage.cdn') as {
      images?: string;
      videos?: string;
      files?: string;
    };

    switch (context) {
      case StorageContext.PIN_IMAGE:
      case StorageContext.PROFILE_IMAGE:
      case StorageContext.COVER_IMAGE:
        return {
          bucket: buckets?.images ?? 'images',
          cdnUrl: cdn?.images,
        };
      case StorageContext.PIN_VIDEO:
        return {
          bucket: buckets?.videos ?? 'videos',
          cdnUrl: cdn?.videos,
        };
      case StorageContext.PIN_FILE:
      default:
        return {
          bucket: buckets?.files ?? 'files',
          cdnUrl: cdn?.files,
        };
    }
  }

  private sanitizeFileName(fileName: string): string {
    const extIndex = fileName.lastIndexOf('.');
    const name = extIndex > 0 ? fileName.slice(0, extIndex) : fileName;
    const ext = extIndex > 0 ? fileName.slice(extIndex) : '';

    const sanitizedName = name
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return sanitizedName.length > 0 ? `${sanitizedName}${ext}` : `file${ext}`;
  }

  private buildFileKey(context: StorageContext, fileName: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const sanitized = this.sanitizeFileName(fileName);
    const uuid = randomUUID();

    return `${context}/${year}/${month}/${uuid}-${sanitized}`;
  }

  private buildPublicUrl(bucket: string, fileKey: string, cdnUrl?: string): string {
    if (cdnUrl) {
      const base = cdnUrl.replace(/\/$/, '');
      const key = fileKey.replace(/^\//, '');
      return `${base}/${key}`;
    }

    const endpoint = this.configService.get<string>('storage.endpoint');
    const port = this.configService.get<number>('storage.port');
    const useSsl = this.configService.get<boolean>('storage.useSsl');

    const protocol = useSsl ? 'https' : 'http';
    const endpointBase = port
      ? `${protocol}://${endpoint}:${port}`
      : `${protocol}://${endpoint}`;

    return `${endpointBase.replace(/\/$/, '')}/${bucket}/${fileKey.replace(
      /^\//,
      '',
    )}`;
  }

  async getPresignedUrl(
    presignDto: PresignDto,
  ): Promise<PresignedUrlResponse> {
    const { bucket, cdnUrl } = this.getBucketAndCdnForContext(
      presignDto.context,
    );
    const fileKey = this.buildFileKey(presignDto.context, presignDto.fileName);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fileKey,
      ContentType: presignDto.mimeType,
      ContentLength: presignDto.fileSize,
    });

    const expiresIn = 300; // 5 minutes
    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn,
    });

    const publicUrl = this.buildPublicUrl(bucket, fileKey, cdnUrl);

    return {
      uploadUrl,
      publicUrl,
      fileKey,
    };
  }
}