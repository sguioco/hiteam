import { Injectable } from '@nestjs/common';
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

  constructor(private readonly configService: ConfigService) {
    this.provider = this.configService.get<string>('BIOMETRIC_PROVIDER', 'guided-web');
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
    return this.isAwsRekognitionEnabled() ? 'aws-rekognition' : 'guided-web';
  }

  isAwsRekognitionEnabled() {
    return this.provider === 'aws-rekognition';
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
}
