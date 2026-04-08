import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import {
  CreateFaceLivenessSessionCommand,
  CompareFacesCommand,
  GetFaceLivenessSessionResultsCommand,
  RekognitionClient,
} from '@aws-sdk/client-rekognition';
import { AssumeRoleCommand, STSClient } from '@aws-sdk/client-sts';

@Injectable()
export class BiometricProviderService {
  private readonly client: RekognitionClient;
  private readonly stsClient: STSClient;
  private readonly provider: string;
  private readonly comprefaceBaseUrl: string | null;
  private readonly comprefaceApiKey: string | null;
  private readonly comprefaceSimilarityThreshold: number;

  constructor(private readonly configService: ConfigService) {
    this.provider = this.configService.get<string>('BIOMETRIC_PROVIDER', 'guided-web');
    this.comprefaceBaseUrl = this.configService.get<string>('COMPRE_FACE_BASE_URL')?.replace(/\/$/, '') ?? null;
    this.comprefaceApiKey = this.configService.get<string>('COMPRE_FACE_API_KEY') ?? null;
    const rawCompreFaceThreshold = Number(
      this.configService.get<string>('COMPRE_FACE_SIMILARITY_THRESHOLD', '0.60'),
    );
    this.comprefaceSimilarityThreshold = Number.isFinite(rawCompreFaceThreshold)
      ? Math.min(Math.max(rawCompreFaceThreshold, 0), 1)
      : 0.6;
    this.client = new RekognitionClient({
      region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
      credentials: this.configService.get<string>('AWS_ACCESS_KEY_ID') && this.configService.get<string>('AWS_SECRET_ACCESS_KEY')
        ? {
            accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', ''),
            secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY', ''),
          }
        : undefined,
    });
    this.stsClient = new STSClient({
      region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
      credentials: this.configService.get<string>('AWS_ACCESS_KEY_ID') && this.configService.get<string>('AWS_SECRET_ACCESS_KEY')
        ? {
            accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', ''),
            secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY', ''),
          }
        : undefined,
    });
  }

  getProviderName() {
    if (this.isAwsRekognitionEnabled()) {
      return 'aws-rekognition';
    }

    if (this.isCompreFaceEnabled()) {
      return 'compreface';
    }

    return 'guided-web';
  }

  isAwsRekognitionEnabled() {
    return this.provider === 'aws-rekognition';
  }

  isCompreFaceEnabled() {
    return this.provider === 'compreface';
  }

  getCompreFaceSimilarityThreshold() {
    return this.comprefaceSimilarityThreshold;
  }

  async compareCompreFaceFaces(sourceBytes: Buffer, targetBytes: Buffer, contentType = 'image/jpeg') {
    if (!this.isCompreFaceEnabled()) {
      return null;
    }

    this.assertCompreFaceConfigured();

    const formData = new FormData();
    formData.append(
      'source_image',
      new Blob([this.toArrayBufferView(sourceBytes)], { type: contentType }),
      'source.jpg',
    );
    formData.append(
      'target_image',
      new Blob([this.toArrayBufferView(targetBytes)], { type: contentType }),
      'target.jpg',
    );

    const response = await this.callCompreFace(
      '/api/v1/verification/verify?limit=1',
      {
        method: 'POST',
        body: formData,
      },
    );

    const firstResult = Array.isArray(response?.result) ? response.result[0] : null;
    const match = Array.isArray(firstResult?.face_matches) ? firstResult.face_matches[0] : null;

    return {
      similarity: match && typeof match.similarity === 'number' ? match.similarity : 0,
      rawResult: response ?? null,
    };
  }

  async compareFaces(sourceBytes: Buffer, targetBytes: Buffer) {
    if (!this.isAwsRekognitionEnabled()) {
      return null;
    }

    const response = await this.client.send(
      new CompareFacesCommand({
        SimilarityThreshold: Number(
          this.configService.get<string>('AWS_REKOGNITION_SIMILARITY_THRESHOLD', '90'),
        ),
        SourceImage: { Bytes: sourceBytes },
        TargetImage: { Bytes: targetBytes },
      }),
    );

    const bestMatch = response.FaceMatches?.sort(
      (left, right) => (right.Similarity ?? 0) - (left.Similarity ?? 0),
    )[0];

    return bestMatch?.Similarity ? bestMatch.Similarity / 100 : 0;
  }

  async getLivenessScore(sessionId?: string | null) {
    if (!this.isAwsRekognitionEnabled() || !sessionId) {
      return null;
    }

    const result = await this.getLivenessSessionResult(sessionId);
    return result?.confidence ?? null;
  }

  async createLivenessSession() {
    if (!this.isAwsRekognitionEnabled()) {
      return null;
    }

    const response = await this.client.send(
      new CreateFaceLivenessSessionCommand({
        ClientRequestToken: randomUUID(),
        Settings: {
          AuditImagesLimit: 4,
        },
      }),
    );

    return {
      sessionId: response.SessionId ?? null,
      region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
    };
  }

  async createTemporaryCredentials() {
    if (!this.isAwsRekognitionEnabled()) {
      return null;
    }

    const roleArn = this.configService.get<string>('AWS_BIOMETRIC_ASSUME_ROLE_ARN');
    if (!roleArn) {
      return null;
    }

    const response = await this.stsClient.send(
      new AssumeRoleCommand({
        RoleArn: roleArn,
        RoleSessionName: `smart-biometric-${Date.now()}`,
        DurationSeconds: Number(
          this.configService.get<string>('AWS_BIOMETRIC_SESSION_DURATION_SECONDS', '900'),
        ),
        ExternalId: this.configService.get<string>('AWS_BIOMETRIC_EXTERNAL_ID') || undefined,
      }),
    );

    if (!response.Credentials) {
      return null;
    }

    return {
      accessKeyId: response.Credentials.AccessKeyId ?? '',
      secretAccessKey: response.Credentials.SecretAccessKey ?? '',
      sessionToken: response.Credentials.SessionToken ?? '',
      expiration: response.Credentials.Expiration?.toISOString() ?? null,
    };
  }

  async getLivenessSessionResult(sessionId: string) {
    if (!this.isAwsRekognitionEnabled()) {
      return null;
    }

    const response = await this.client.send(
      new GetFaceLivenessSessionResultsCommand({
        SessionId: sessionId,
      }),
    );

    return {
      confidence: response.Confidence ? response.Confidence / 100 : null,
      status: response.Status ?? null,
      referenceImageBytes: response.ReferenceImage?.Bytes ? Buffer.from(response.ReferenceImage.Bytes) : null,
      auditImageCount: response.AuditImages?.length ?? 0,
    };
  }

  private assertCompreFaceConfigured() {
    if (!this.comprefaceBaseUrl || !this.comprefaceApiKey) {
      throw new Error('CompreFace is enabled but COMPRE_FACE_BASE_URL or COMPRE_FACE_API_KEY is missing.');
    }
  }

  private async callCompreFace(path: string, init: RequestInit, throwOnNonOk = true) {
    const headers = new Headers(init.headers ?? {});
    headers.set('x-api-key', this.comprefaceApiKey ?? '');

    if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${this.comprefaceBaseUrl}${path}`, {
      ...init,
      headers,
    });

    if (!response.ok) {
      if (!throwOnNonOk) {
        return null;
      }

      const text = await response.text();
      throw new BadRequestException(
        this.normalizeCompreFaceErrorMessage(text) ||
          `CompreFace request failed with status ${response.status}.`,
      );
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      return null;
    }

    return response.json() as Promise<Record<string, any>>;
  }

  private toArrayBufferView(buffer: Buffer) {
    const view = new Uint8Array(buffer.byteLength);
    view.set(buffer);
    return view;
  }

  private normalizeCompreFaceErrorMessage(raw: string) {
    const normalized = raw.trim();
    if (!normalized) {
      return null;
    }

    try {
      const parsed = JSON.parse(normalized) as { message?: string; code?: number; error?: string };
      const message = parsed.message ?? parsed.error ?? normalized;
      const code = parsed.code ?? null;
      return this.mapCompreFaceMessage(message, code);
    } catch {
      return this.mapCompreFaceMessage(normalized, null);
    }
  }

  private mapCompreFaceMessage(message: string, code: number | null) {
    if (code === 28 || /No face is found in the given image/i.test(message)) {
      return 'No face detected in the photo. Retake it in better light and keep your face centered in the frame.';
    }

    if (/more than one face/i.test(message)) {
      return 'More than one face was detected in the photo. Keep only one person in the frame and try again.';
    }

    return message;
  }

}
