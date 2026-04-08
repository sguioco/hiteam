import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly endpoint?: string;
  private readonly publicBaseUrl?: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('S3_BUCKET', '');
    this.endpoint = this.configService.get<string>('S3_ENDPOINT');
    this.publicBaseUrl = this.configService.get<string>('S3_PUBLIC_BASE_URL');

    this.client = new S3Client({
      region: this.configService.get<string>('S3_REGION', 'us-east-1'),
      endpoint: this.endpoint || undefined,
      forcePathStyle: Boolean(this.endpoint),
      credentials: this.configService.get<string>('S3_ACCESS_KEY') && this.configService.get<string>('S3_SECRET_KEY')
        ? {
            accessKeyId: this.configService.get<string>('S3_ACCESS_KEY', ''),
            secretAccessKey: this.configService.get<string>('S3_SECRET_KEY', ''),
          }
        : undefined,
    });
  }

  isConfigured() {
    return Boolean(this.bucket);
  }

  async uploadDataUrl(key: string, dataUrl: string) {
    const { buffer, contentType } = this.parseDataUrl(dataUrl);
    await this.uploadBuffer(key, buffer, contentType);
    return {
      key,
      contentType,
      sizeBytes: buffer.length,
      url: this.resolveUrl(key),
    };
  }

  async uploadBuffer(key: string, buffer: Buffer, contentType = 'application/octet-stream') {
    if (!this.isConfigured()) {
      throw new InternalServerErrorException('Object storage is not configured.');
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
  }

  async getObjectBuffer(key: string) {
    if (!this.isConfigured()) {
      throw new InternalServerErrorException('Object storage is not configured.');
    }

    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    const chunks: Buffer[] = [];
    const body = response.Body;

    if (!body || typeof (body as AsyncIterable<Uint8Array>)[Symbol.asyncIterator] !== 'function') {
      throw new InternalServerErrorException('Object storage returned an unreadable stream.');
    }

    for await (const chunk of body as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  getObjectUrl(key: string) {
    return this.resolveUrl(key);
  }

  private resolveUrl(key: string) {
    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl.replace(/\/$/, '')}/${key}`;
    }

    if (this.endpoint) {
      return `${this.endpoint.replace(/\/$/, '')}/${this.bucket}/${key}`;
    }

    return null;
  }

  private parseDataUrl(dataUrl: string) {
    const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
      throw new InternalServerErrorException('Biometric artifact is not a valid data URL.');
    }

    return {
      contentType: match[1],
      buffer: Buffer.from(match[2], 'base64'),
    };
  }
}
