import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

type StoredObject = {
  buffer: Buffer;
  contentLength: number;
  contentType: string;
  etag?: string;
  lastModified?: Date;
};

type CachedStoredObject = StoredObject & {
  expiresAt: number;
};

const HOT_OBJECT_CACHE_TTL_MS = 10 * 60_000;
const HOT_OBJECT_CACHE_MAX_ITEMS = 100;
const HOT_OBJECT_CACHE_MAX_BYTES = 5 * 1024 * 1024;
const HOT_OBJECT_CACHE_MAX_TOTAL_BYTES = 50 * 1024 * 1024;

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly endpoint?: string;
  private readonly publicBaseUrl?: string;
  private readonly apiPublicUrl?: string;
  private readonly hotObjectCache = new Map<string, CachedStoredObject>();
  private hotObjectCacheBytes = 0;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>('S3_BUCKET', '');
    this.endpoint = this.configService.get<string>('S3_ENDPOINT');
    this.publicBaseUrl = this.configService.get<string>('S3_PUBLIC_BASE_URL');
    this.apiPublicUrl = this.configService.get<string>('API_PUBLIC_URL');

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
      throw new ServiceUnavailableException('Object storage is not configured.');
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
    const object = await this.getObject(key);
    return object.buffer;
  }

  async getObject(key: string): Promise<StoredObject> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('Object storage is not configured.');
    }

    const cached = this.getCachedObject(key);
    if (cached) {
      return cached;
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
      throw new ServiceUnavailableException('Object storage returned an unreadable stream.');
    }

    for await (const chunk of body as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }

    const buffer = Buffer.concat(chunks);
    const object = {
      buffer,
      contentLength: response.ContentLength ?? buffer.length,
      contentType: response.ContentType ?? this.inferContentType(key),
      etag: response.ETag,
      lastModified: response.LastModified,
    };

    this.setCachedObject(key, object);

    return object;
  }

  async deleteObject(key: string) {
    if (!this.isConfigured()) {
      return;
    }

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
    this.deleteCachedObject(key);
  }

  getObjectUrl(key: string) {
    return this.resolveUrl(key);
  }

  getTaskPhotoProofUrl(proofId: string, storageKey?: string) {
    return (
      this.resolveApiUrl(`/media/task-photo-proofs/${encodeURIComponent(proofId)}/file`) ??
      (storageKey ? this.resolveUrl(storageKey) : null)
    );
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

  private resolveApiUrl(path: string) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const apiPublicUrl = this.apiPublicUrl?.trim().replace(/\/$/, '');

    if (!apiPublicUrl) {
      return null;
    }

    return `${apiPublicUrl}/api/v1${normalizedPath}`;
  }

  private getCachedObject(key: string): StoredObject | null {
    const cached = this.hotObjectCache.get(key);

    if (!cached) {
      return null;
    }

    if (cached.expiresAt <= Date.now()) {
      this.deleteCachedObject(key);
      return null;
    }

    this.hotObjectCache.delete(key);
    this.hotObjectCache.set(key, cached);

    return cached;
  }

  private setCachedObject(key: string, object: StoredObject) {
    if (object.buffer.length > HOT_OBJECT_CACHE_MAX_BYTES) {
      return;
    }

    this.deleteCachedObject(key);

    while (
      this.hotObjectCache.size >= HOT_OBJECT_CACHE_MAX_ITEMS ||
      this.hotObjectCacheBytes + object.buffer.length > HOT_OBJECT_CACHE_MAX_TOTAL_BYTES
    ) {
      const oldest = this.hotObjectCache.keys().next();

      if (oldest.done) {
        break;
      }

      this.deleteCachedObject(oldest.value);
    }

    this.hotObjectCache.set(key, {
      ...object,
      expiresAt: Date.now() + HOT_OBJECT_CACHE_TTL_MS,
    });
    this.hotObjectCacheBytes += object.buffer.length;
  }

  private deleteCachedObject(key: string) {
    const cached = this.hotObjectCache.get(key);

    if (!cached) {
      return;
    }

    this.hotObjectCacheBytes = Math.max(
      0,
      this.hotObjectCacheBytes - cached.buffer.length,
    );
    this.hotObjectCache.delete(key);
  }

  private inferContentType(key: string) {
    const normalized = key.toLowerCase();

    if (normalized.endsWith('.png')) {
      return 'image/png';
    }

    if (normalized.endsWith('.webp')) {
      return 'image/webp';
    }

    if (normalized.endsWith('.gif')) {
      return 'image/gif';
    }

    if (normalized.endsWith('.heic') || normalized.endsWith('.heif')) {
      return 'image/heic';
    }

    return 'image/jpeg';
  }

  private parseDataUrl(dataUrl: string) {
    const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
      throw new BadRequestException('Biometric artifact is not a valid data URL.');
    }

    return {
      contentType: match[1],
      buffer: Buffer.from(match[2], 'base64'),
    };
  }
}
