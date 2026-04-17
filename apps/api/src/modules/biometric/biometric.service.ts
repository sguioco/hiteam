import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BiometricArtifactKind,
  BiometricEnrollmentStatus,
  BiometricJobStatus,
  BiometricJobType,
  BiometricVerificationResult,
} from '@prisma/client';
import { Job, Queue, Worker } from 'bullmq';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../storage/storage.service';
import { StartEnrollmentDto } from './dto/start-enrollment.dto';
import { CompleteEnrollmentDto } from './dto/complete-enrollment.dto';
import { VerifyBiometricDto } from './dto/verify-biometric.dto';
import { BiometricProviderService } from './biometric-provider.service';
import { BiometricReviewsQueryDto } from './dto/biometric-reviews-query.dto';
import { ReviewBiometricVerificationDto } from './dto/review-biometric-verification.dto';
import { ListTeamBiometricJobsQueryDto } from './dto/list-team-biometric-jobs-query.dto';

const ATTENDANCE_VERIFICATION_MAX_AGE_MS = 5 * 60 * 1000;

@Injectable()
export class BiometricService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BiometricService.name);
  private queue: Queue | null = null;
  private worker: Worker | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly storageService: StorageService,
    private readonly biometricProviderService: BiometricProviderService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      return;
    }

    const connection = this.buildBullConnection(redisUrl);

    this.queue = new Queue('smart-biometric-jobs', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    });

    this.worker = new Worker(
      'smart-biometric-jobs',
      async (job) => this.processBiometricJob(job),
      {
        connection,
        concurrency: 2,
      },
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  async getPolicy(userId: string) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
      include: { biometricProfile: true },
    });
    const provider = this.biometricProviderService.getProviderName();

    return {
      employeeId: employee.id,
      enrollmentStatus: employee.biometricProfile?.enrollmentStatus ?? BiometricEnrollmentStatus.NOT_STARTED,
      provider,
      rules: {
        enrollmentRequired: true,
        livenessRequired: false,
        faceMatchRequired: true,
        auditEnabled: true,
      },
    };
  }

  async startEnrollment(userId: string, dto: StartEnrollmentDto) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
      include: { biometricProfile: true },
    });
    this.assertEnrollmentCanBeStarted(employee.biometricProfile);

    const profile = await this.prisma.biometricProfile.upsert({
      where: { employeeId: employee.id },
      update: {
        enrollmentStatus: BiometricEnrollmentStatus.PENDING,
        consentVersion: dto.consentVersion ?? 'v1',
        consentedAt: new Date(),
      },
      create: {
        employeeId: employee.id,
        enrollmentStatus: BiometricEnrollmentStatus.PENDING,
        consentVersion: dto.consentVersion ?? 'v1',
        consentedAt: new Date(),
      },
    });

    await this.auditService.log({
      tenantId: employee.tenantId,
      actorUserId: userId,
      entityType: 'biometric_profile',
      entityId: profile.id,
      action: 'biometric.enrollment_started',
      metadata: { consentVersion: dto.consentVersion ?? 'v1' },
    });

    return {
      profileId: profile.id,
      enrollmentStatus: profile.enrollmentStatus,
      nextStep: 'capture_selfie_sequence',
    };
  }

  async createAwsLivenessBootstrap(userId: string, mode: 'enroll' | 'verify') {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
      include: { biometricProfile: true },
    });

    if (mode === 'enroll') {
      this.assertEnrollmentCanBeStarted(employee.biometricProfile);
    } else if (
      !employee.biometricProfile ||
      employee.biometricProfile.enrollmentStatus !== BiometricEnrollmentStatus.ENROLLED
    ) {
      throw new ForbiddenException('Biometric enrollment must be completed before verification.');
    }

    if (!this.biometricProviderService.isAwsRekognitionEnabled()) {
      throw new ForbiddenException('AWS face liveness provider is not enabled.');
    }

    const [session, credentials] = await Promise.all([
      this.biometricProviderService.createLivenessSession(),
      this.biometricProviderService.createTemporaryCredentials(),
    ]);

    if (!session || !credentials) {
      throw new ForbiddenException('AWS face liveness is not fully configured.');
    }

    await this.auditService.log({
      tenantId: employee.tenantId,
      actorUserId: userId,
      entityType: 'biometric_liveness_session',
      entityId: session.sessionId ?? 'unknown',
      action: 'biometric.liveness_bootstrap_created',
      metadata: {
        mode,
        region: session.region,
      },
    });

    return {
      sessionId: session.sessionId,
      region: session.region,
      credentials,
    };
  }

  async completeEnrollment(userId: string, dto: CompleteEnrollmentDto) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
      include: { biometricProfile: true },
    });
    this.assertEnrollmentCanBeStarted(employee.biometricProfile);
    const awsProviderEnabled = this.biometricProviderService.isAwsRekognitionEnabled();
    const comprefaceEnabled = this.biometricProviderService.isCompreFaceEnabled();
    const comprefaceFallbackEnabled = this.biometricProviderService.canUseCompreFaceFallback();
    const comprefaceAvailable = comprefaceEnabled || comprefaceFallbackEnabled;
    const awsSessionId =
      typeof dto.captureMetadata?.awsLivenessSessionId === 'string'
        ? dto.captureMetadata.awsLivenessSessionId
        : null;
    const uploadedArtifacts = await this.saveArtifacts({
      tenantId: employee.tenantId,
      employeeId: employee.id,
      artifacts: dto.artifacts ?? [],
      captureMetadata: dto.captureMetadata ?? null,
      kind: BiometricArtifactKind.ENROLLMENT,
    });
    let awsLivenessResult: Awaited<ReturnType<typeof this.biometricProviderService.getLivenessSessionResult>> | null = null;
    let providerUsed = this.biometricProviderService.getProviderName();
    if (awsProviderEnabled && awsSessionId) {
      try {
        awsLivenessResult = await this.biometricProviderService.getLivenessSessionResult(awsSessionId);
      } catch (error) {
        const details = error instanceof Error ? error.message : String(error);
        this.logger.warn(`AWS liveness enrollment lookup failed, continuing with uploaded selfie: ${details}`);
      }
    }

    const awsReady = awsProviderEnabled && Boolean(awsLivenessResult?.confidence !== null);

    if (awsProviderEnabled) {
      providerUsed = 'aws-rekognition';
    } else if (comprefaceAvailable) {
      providerUsed = 'compreface';
    }

    const providerReferenceKey =
      awsReady && awsLivenessResult?.referenceImageBytes && this.storageService.isConfigured()
        ? await this.saveProviderReferenceArtifact(
            employee.tenantId,
            employee.id,
            BiometricArtifactKind.ENROLLMENT,
            awsLivenessResult.referenceImageBytes,
            dto.captureMetadata ?? null,
          )
        : null;
    const inlineTemplateRef =
      this.isInlineBiometricReference(dto.artifacts?.[0])
        ? dto.artifacts?.[0] ?? null
        : null;
    const templateRef = providerReferenceKey ?? uploadedArtifacts[0]?.storageKey ?? dto.templateRef ?? inlineTemplateRef;
    const livenessScore = awsReady ? awsLivenessResult?.confidence ?? dto.livenessScore ?? null : dto.livenessScore ?? null;
    if (!templateRef) {
      throw new BadRequestException('Unable to create a biometric reference image for enrollment.');
    }

    const profile = await this.prisma.biometricProfile.upsert({
      where: { employeeId: employee.id },
      update: {
        enrollmentStatus: BiometricEnrollmentStatus.ENROLLED,
        templateRef,
        enrolledAt: new Date(),
        lastVerifiedAt: new Date(),
        provider: providerUsed,
      },
      create: {
        employeeId: employee.id,
        enrollmentStatus: BiometricEnrollmentStatus.ENROLLED,
        templateRef,
        enrolledAt: new Date(),
        lastVerifiedAt: new Date(),
        provider: providerUsed,
      },
    });

    await this.auditService.log({
      tenantId: employee.tenantId,
      actorUserId: userId,
      entityType: 'biometric_profile',
      entityId: profile.id,
      action: 'biometric.enrollment_completed',
      metadata: {
        templateRef: this.normalizeBiometricReferenceForAudit(templateRef),
        livenessScore,
        captureMetadata: dto.captureMetadata ?? null,
        artifactKeys: uploadedArtifacts.map((item) => item.storageKey),
        provider: providerUsed,
        awsLivenessSessionId: awsSessionId,
      },
    });

    return {
      profileId: profile.id,
      enrollmentStatus: profile.enrollmentStatus,
      enrolledAt: profile.enrolledAt?.toISOString() ?? null,
    };
  }

  async verify(userId: string, dto: VerifyBiometricDto) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
      include: { biometricProfile: true },
    });

    return this.performVerification(employee, userId, dto);
  }

  async queueVerify(userId: string, dto: VerifyBiometricDto) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
      include: { biometricProfile: true },
    });

    if (!employee.biometricProfile || employee.biometricProfile.enrollmentStatus !== BiometricEnrollmentStatus.ENROLLED) {
      throw new ForbiddenException('Biometric enrollment is required before verification.');
    }

    const biometricJob = await this.prisma.biometricJob.create({
      data: {
        tenantId: employee.tenantId,
        employeeId: employee.id,
        type: BiometricJobType.VERIFY,
        payloadJson: JSON.stringify(dto),
      },
    });

    await this.enqueueBiometricJob(biometricJob.id);

    await this.auditService.log({
      tenantId: employee.tenantId,
      actorUserId: userId,
      entityType: 'biometric_job',
      entityId: biometricJob.id,
      action: 'biometric.verify_queued',
      metadata: {
        type: biometricJob.type,
      },
    });

    return this.serializeBiometricJob(biometricJob);
  }

  async listMyJobs(userId: string) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });

    const jobs = await this.prisma.biometricJob.findMany({
      where: {
        employeeId: employee.id,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      items: jobs.map((job) => this.serializeBiometricJob(job)),
    };
  }

  async listTeamJobs(tenantId: string, query: ListTeamBiometricJobsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = {
      tenantId,
      status: query.status ?? undefined,
      OR: query.search
        ? [
            {
              employee: {
                firstName: { contains: query.search, mode: 'insensitive' as const },
              },
            },
            {
              employee: {
                lastName: { contains: query.search, mode: 'insensitive' as const },
              },
            },
            {
              employee: {
                employeeNumber: { contains: query.search, mode: 'insensitive' as const },
              },
            },
            { errorMessage: { contains: query.search, mode: 'insensitive' as const } },
          ]
        : undefined,
    };

    const [jobs, total] = await Promise.all([
      this.prisma.biometricJob.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNumber: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.biometricJob.count({ where }),
    ]);

    return {
      items: jobs.map((job) => ({
        ...this.serializeBiometricJob(job),
        employee: {
          id: job.employee.id,
          firstName: job.employee.firstName,
          lastName: job.employee.lastName,
          employeeNumber: job.employee.employeeNumber,
        },
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getMyJob(userId: string, jobId: string) {
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { userId },
    });

    const job = await this.prisma.biometricJob.findFirstOrThrow({
      where: {
        id: jobId,
        employeeId: employee.id,
      },
    });

    return this.serializeBiometricJob(job);
  }

  async requireFreshAttendanceVerification(employeeId: string, verificationId: string) {
    const verification = await this.prisma.biometricVerification.findFirst({
      where: {
        id: verificationId,
        employeeId,
      },
    });

    if (!verification) {
      throw new ForbiddenException('Biometric verification for this employee was not found.');
    }

    if (verification.attendanceEventId) {
      throw new ForbiddenException('Biometric verification has already been used for another attendance event.');
    }

    if (Date.now() - verification.capturedAt.getTime() > ATTENDANCE_VERIFICATION_MAX_AGE_MS) {
      throw new ForbiddenException('Biometric verification is too old. Capture a fresh face scan.');
    }

    if (verification.result === BiometricVerificationResult.PASSED) {
      return verification;
    }

    throw new ForbiddenException('Biometric verification did not pass.');
  }

  async attachVerificationToAttendanceEvent(employeeId: string, verificationId: string, attendanceEventId: string) {
    const updated = await this.prisma.biometricVerification.updateMany({
      where: {
        id: verificationId,
        employeeId,
        attendanceEventId: null,
      },
      data: {
        attendanceEventId,
      },
    });

    if (updated.count === 0) {
      throw new BadRequestException('Unable to link biometric verification to attendance event.');
    }
  }

  async getQueueRuntime() {
    if (!this.queue) {
      return {
        available: false,
        paused: false,
        mode: 'inline' as const,
      };
    }

    return {
      available: true,
      paused: await this.queue.isPaused(),
      mode: 'bullmq' as const,
    };
  }

  async pauseQueue() {
    if (!this.queue) {
      return this.getQueueRuntime();
    }

    await this.queue.pause();
    return this.getQueueRuntime();
  }

  async resumeQueue() {
    if (!this.queue) {
      return this.getQueueRuntime();
    }

    await this.queue.resume();
    return this.getQueueRuntime();
  }

  async requeueJob(tenantId: string, actorUserId: string, jobId: string) {
    const biometricJob = await this.prisma.biometricJob.findFirst({
      where: {
        tenantId,
        id: jobId,
      },
    });

    if (!biometricJob) {
      throw new NotFoundException('Biometric job not found.');
    }

    if (biometricJob.status === BiometricJobStatus.QUEUED || biometricJob.status === BiometricJobStatus.PROCESSING) {
      throw new BadRequestException('Biometric job is already active.');
    }

    const nextJob = await this.prisma.biometricJob.update({
      where: { id: biometricJob.id },
      data: {
        status: BiometricJobStatus.QUEUED,
        errorMessage: null,
        resultJson: null,
        startedAt: null,
        completedAt: null,
      },
    });

    await this.auditService.log({
      tenantId,
      actorUserId,
      entityType: 'biometric_job',
      entityId: biometricJob.id,
      action: 'biometric.job_requeued',
      metadata: {
        previousStatus: biometricJob.status,
        type: biometricJob.type,
      },
    });

    await this.enqueueBiometricJob(nextJob.id);

    return this.serializeBiometricJob(nextJob);
  }

  async bulkRequeueJobs(tenantId: string, actorUserId: string, jobIds: string[]) {
    const items = [];

    for (const jobId of jobIds) {
      items.push(await this.requeueJob(tenantId, actorUserId, jobId));
    }

    return { items };
  }

  private async enqueueBiometricJob(biometricJobId: string) {
    if (this.queue) {
      await this.queue.add('verify', { biometricJobId });
      return;
    }

    await this.processBiometricJob({ data: { biometricJobId } } as Job<{ biometricJobId: string }>);
  }

  private async performVerification(
    employee: {
      id: string;
      tenantId: string;
      firstName: string;
      lastName: string;
      biometricProfile: {
        enrollmentStatus: BiometricEnrollmentStatus;
        templateRef: string | null;
      } | null;
    },
    userId: string,
    dto: VerifyBiometricDto,
  ) {
    if (!employee.biometricProfile || employee.biometricProfile.enrollmentStatus !== BiometricEnrollmentStatus.ENROLLED) {
      throw new ForbiddenException('Biometric enrollment is required before verification.');
    }
    const awsProviderEnabled = this.biometricProviderService.isAwsRekognitionEnabled();
    const comprefaceEnabled = this.biometricProviderService.isCompreFaceEnabled();
    const comprefaceFallbackEnabled = this.biometricProviderService.canUseCompreFaceFallback();
    const comprefaceAvailable = comprefaceEnabled || comprefaceFallbackEnabled;

    const uploadedArtifacts = await this.saveArtifacts({
      tenantId: employee.tenantId,
      employeeId: employee.id,
      artifacts: dto.artifacts ?? [],
      captureMetadata: dto.captureMetadata ?? null,
      kind: BiometricArtifactKind.VERIFICATION,
    });
    const awsSessionId =
      typeof dto.captureMetadata?.awsLivenessSessionId === 'string'
        ? dto.captureMetadata.awsLivenessSessionId
        : null;
    let awsLivenessResult: Awaited<ReturnType<typeof this.biometricProviderService.getLivenessSessionResult>> | null = null;
    if (awsProviderEnabled && awsSessionId) {
      try {
        awsLivenessResult = await this.biometricProviderService.getLivenessSessionResult(awsSessionId);
      } catch (error) {
        const details = error instanceof Error ? error.message : String(error);
        this.logger.warn(`AWS liveness verification lookup failed, continuing with uploaded selfie: ${details}`);
      }
    }

    const awsReady = awsProviderEnabled && awsLivenessResult?.confidence !== null;

    const providerReferenceKey =
      awsReady && awsLivenessResult?.referenceImageBytes && this.storageService.isConfigured()
        ? await this.saveProviderReferenceArtifact(
            employee.tenantId,
            employee.id,
            BiometricArtifactKind.VERIFICATION,
            awsLivenessResult.referenceImageBytes,
            dto.captureMetadata ?? null,
          )
        : null;
    const targetArtifactRef = providerReferenceKey ?? uploadedArtifacts[0]?.storageKey ?? dto.artifacts?.[0] ?? null;
    const templateRef = employee.biometricProfile.templateRef;
    const [sourceBytes, targetBytes] = await Promise.all([
      this.resolveBiometricReferenceBytes(templateRef),
      this.resolveBiometricReferenceBytes(targetArtifactRef),
    ]);
    const awsComparisonAvailable = awsProviderEnabled && Boolean(sourceBytes && targetBytes);

    if ((awsComparisonAvailable || comprefaceAvailable) && (!sourceBytes || !targetBytes)) {
      throw new BadRequestException('Biometric reference or verification image is missing for AWS comparison.');
    }

    let providerMatchScore: number | null = null;
    let comprefaceVerification: Awaited<ReturnType<typeof this.biometricProviderService.compareCompreFaceFaces>> | null = null;
    let providerUsed = this.biometricProviderService.getProviderName();
    let providerLivenessScore = awsReady ? awsLivenessResult?.confidence ?? null : null;
    let awsComparisonSucceeded = false;

    if (awsComparisonAvailable && sourceBytes && targetBytes) {
      try {
        providerMatchScore = await this.biometricProviderService.compareFaces(sourceBytes, targetBytes);
        providerUsed = 'aws-rekognition';
        awsComparisonSucceeded = true;
      } catch (error) {
        if (!comprefaceFallbackEnabled) {
          throw error;
        }

        providerLivenessScore = null;
        this.logAwsFallback('verification', error);
      }
    }

    if (!awsComparisonSucceeded && comprefaceAvailable && sourceBytes && targetBytes) {
      comprefaceVerification = await this.biometricProviderService.compareCompreFaceFaces(sourceBytes, targetBytes);
      providerUsed = 'compreface';
    }

    if (awsComparisonSucceeded && providerMatchScore === null) {
      throw new BadRequestException('AWS face comparison did not return a similarity score.');
    }
    if (!awsComparisonSucceeded && comprefaceAvailable && !comprefaceVerification) {
      throw new BadRequestException('CompreFace did not return a similarity score.');
    }
    const livenessScore = comprefaceVerification ? null : providerLivenessScore;
    const matchScore = comprefaceVerification
      ? comprefaceVerification?.similarity ?? null
      : providerMatchScore;
    if (matchScore === null) {
      throw new BadRequestException('Biometric verification requires a face match score.');
    }
    const result =
      comprefaceVerification
        ? matchScore !== null && matchScore >= this.biometricProviderService.getCompreFaceSimilarityThreshold()
          ? BiometricVerificationResult.PASSED
          : BiometricVerificationResult.FAILED
        : matchScore >= this.biometricProviderService.getAwsSimilarityThreshold()
        ? BiometricVerificationResult.PASSED
        : BiometricVerificationResult.FAILED;

    const verification = await this.prisma.biometricVerification.create({
      data: {
        employeeId: employee.id,
        attendanceEventId: dto.attendanceEventId,
        result,
        manualReviewStatus: null,
        livenessScore,
        matchScore,
        reviewReason: result === BiometricVerificationResult.FAILED ? 'Threshold not met' : null,
        provider: providerUsed,
      },
    });

    if (uploadedArtifacts.length > 0) {
      await this.prisma.biometricArtifact.updateMany({
        where: {
          id: {
            in: uploadedArtifacts.map((item) => item.id),
          },
        },
        data: {
          verificationId: verification.id,
        },
      });
    }

    await this.prisma.biometricProfile.update({
      where: { employeeId: employee.id },
      data: { lastVerifiedAt: new Date() },
    });

    await this.auditService.log({
      tenantId: employee.tenantId,
      actorUserId: userId,
      entityType: 'biometric_verification',
      entityId: verification.id,
      action: 'biometric.verification_completed',
      metadata: {
        attendanceEventId: dto.attendanceEventId ?? null,
        intent: dto.intent ?? null,
        result,
        livenessScore,
        matchScore,
        captureMetadata: dto.captureMetadata ?? null,
        artifactKeys: uploadedArtifacts.map((item) => item.storageKey),
        provider: providerUsed,
        awsLivenessSessionId: awsSessionId,
        comprefaceRawResult: comprefaceVerification?.rawResult ?? null,
      },
    });

    return {
      verificationId: verification.id,
      result,
      livenessScore,
      matchScore,
    };
  }

  private logAwsFallback(context: 'enrollment' | 'verification', error: unknown) {
    const details = error instanceof Error ? error.message : String(error);
    this.logger.warn(`AWS biometric ${context} failed, falling back to CompreFace: ${details}`);
  }

  async getTeamReviews(tenantId: string, query: BiometricReviewsQueryDto) {
    const employees = await this.prisma.employee.findMany({
      where: {
        tenantId,
        id: query.employeeId ?? undefined,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeNumber: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        primaryLocation: {
          select: {
            id: true,
            name: true,
          },
        },
        biometricProfile: true,
        biometricChecks: {
          where: {
            result: query.result ?? undefined,
          },
          orderBy: { capturedAt: 'desc' },
          take: 3,
          include: {
            artifacts: {
              orderBy: { createdAt: 'asc' },
            },
            reviewerEmployee: true,
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const items = employees
      .map((employee) => {
        const latestVerification = employee.biometricChecks[0] ?? null;
        const latestResult = latestVerification?.result ?? null;
        const artifactCount = latestVerification?.artifacts.length ?? 0;

        return {
          employeeId: employee.id,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          employeeNumber: employee.employeeNumber,
          department: employee.department.name,
          location: employee.primaryLocation.name,
          enrollmentStatus:
            employee.biometricProfile?.enrollmentStatus ?? BiometricEnrollmentStatus.NOT_STARTED,
          provider: employee.biometricProfile?.provider ?? this.biometricProviderService.getProviderName(),
          enrolledAt: employee.biometricProfile?.enrolledAt?.toISOString() ?? null,
          lastVerifiedAt: employee.biometricProfile?.lastVerifiedAt?.toISOString() ?? null,
          latestVerification: latestVerification
            ? {
                id: latestVerification.id,
                result: latestVerification.result,
                manualReviewStatus: latestVerification.manualReviewStatus,
                reviewedAt: latestVerification.reviewedAt?.toISOString() ?? null,
                reviewerComment: latestVerification.reviewerComment,
                reviewerEmployee: latestVerification.reviewerEmployee
                  ? {
                      id: latestVerification.reviewerEmployee.id,
                      firstName: latestVerification.reviewerEmployee.firstName,
                      lastName: latestVerification.reviewerEmployee.lastName,
                    }
                  : null,
                livenessScore: latestVerification.livenessScore,
                matchScore: latestVerification.matchScore,
                reviewReason: latestVerification.reviewReason,
                capturedAt: latestVerification.capturedAt.toISOString(),
                artifactCount,
                artifactPreviewUrls: latestVerification.artifacts
                  .map((artifact) => this.storageService.getObjectUrl(artifact.storageKey))
                  .filter((value): value is string => Boolean(value))
                  .slice(0, 2),
              }
            : null,
          pendingReview: latestResult === BiometricVerificationResult.REVIEW,
        };
      })
      .filter((item) => (query.result ? item.latestVerification?.result === query.result : true));

    return {
      totals: {
        employees: items.length,
        enrolled: items.filter((item) => item.enrollmentStatus === BiometricEnrollmentStatus.ENROLLED).length,
        reviewRequired: items.filter((item) => item.pendingReview).length,
        notEnrolled: items.filter((item) => item.enrollmentStatus !== BiometricEnrollmentStatus.ENROLLED).length,
      },
      items,
    };
  }

  async getEmployeeHistory(tenantId: string, employeeId: string, limit = 8) {
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 50;
    const historyWindowStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const employee = await this.prisma.employee.findFirstOrThrow({
      where: {
        tenantId,
        id: employeeId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeNumber: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        primaryLocation: {
          select: {
            id: true,
            name: true,
          },
        },
        biometricProfile: true,
        biometricChecks: {
          where: {
            capturedAt: {
              gte: historyWindowStart,
            },
          },
          orderBy: { capturedAt: 'desc' },
          take: safeLimit,
          include: {
            artifacts: {
              orderBy: { createdAt: 'asc' },
            },
            attendanceEvent: {
              select: {
                id: true,
                eventType: true,
                occurredAt: true,
              },
            },
            reviewerEmployee: true,
          },
        },
      },
    });

    return {
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        employeeNumber: employee.employeeNumber,
        department: employee.department,
        location: employee.primaryLocation,
      },
      profile: employee.biometricProfile
        ? {
            id: employee.biometricProfile.id,
            enrollmentStatus: employee.biometricProfile.enrollmentStatus,
            consentVersion: employee.biometricProfile.consentVersion,
            enrolledAt: employee.biometricProfile.enrolledAt?.toISOString() ?? null,
            lastVerifiedAt: employee.biometricProfile.lastVerifiedAt?.toISOString() ?? null,
            provider: employee.biometricProfile.provider,
            templateRef: this.normalizeBiometricReferenceForAudit(employee.biometricProfile.templateRef),
            templateUrl: employee.biometricProfile.templateRef
              ? this.resolveBiometricReferenceUrl(employee.biometricProfile.templateRef)
              : null,
          }
        : null,
      verifications: employee.biometricChecks.map((verification) => ({
        id: verification.id,
        result: verification.result,
        manualReviewStatus: verification.manualReviewStatus,
        reviewedAt: verification.reviewedAt?.toISOString() ?? null,
        reviewerComment: verification.reviewerComment,
        livenessScore: verification.livenessScore,
        matchScore: verification.matchScore,
        reviewReason: verification.reviewReason,
        capturedAt: verification.capturedAt.toISOString(),
        reviewerEmployee: verification.reviewerEmployee
          ? {
              id: verification.reviewerEmployee.id,
              firstName: verification.reviewerEmployee.firstName,
              lastName: verification.reviewerEmployee.lastName,
            }
          : null,
        attendanceEvent: verification.attendanceEvent
          ? {
              id: verification.attendanceEvent.id,
              eventType: verification.attendanceEvent.eventType,
              occurredAt: verification.attendanceEvent.occurredAt.toISOString(),
            }
          : null,
        artifacts: verification.artifacts.map((artifact) => ({
          id: artifact.id,
          kind: artifact.kind,
          stepId: artifact.stepId,
          contentType: artifact.contentType,
          createdAt: artifact.createdAt.toISOString(),
          storageKey: artifact.storageKey,
          url: this.storageService.getObjectUrl(artifact.storageKey),
        })),
      })),
    };
  }

  async getReviewInbox(tenantId: string) {
    void tenantId;

    return {
      items: [],
    };
  }

  async reviewVerification(user: JwtUser, verificationId: string, dto: ReviewBiometricVerificationDto) {
    void user;
    void verificationId;
    void dto;
    throw new ForbiddenException('Manual biometric review is disabled.');
  }

  private async processBiometricJob(job: Job<{ biometricJobId: string }>) {
    const biometricJob = await this.prisma.biometricJob.findUnique({
      where: { id: job.data.biometricJobId },
      include: {
        employee: {
          include: {
            biometricProfile: true,
            user: true,
          },
        },
      },
    });

    if (!biometricJob || biometricJob.status === BiometricJobStatus.COMPLETED) {
      return;
    }

    await this.prisma.biometricJob.update({
      where: { id: biometricJob.id },
      data: {
        status: BiometricJobStatus.PROCESSING,
        attempts: { increment: 1 },
        startedAt: new Date(),
        errorMessage: null,
      },
    });

    try {
      const payload = biometricJob.payloadJson ? (JSON.parse(biometricJob.payloadJson) as VerifyBiometricDto) : ({} as VerifyBiometricDto);
      const result = await this.performVerification(biometricJob.employee, biometricJob.employee.userId, payload);

      await this.prisma.biometricJob.update({
        where: { id: biometricJob.id },
        data: {
          status: BiometricJobStatus.COMPLETED,
          resultJson: JSON.stringify(result),
          completedAt: new Date(),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Biometric job failed.';
      await this.prisma.biometricJob.update({
        where: { id: biometricJob.id },
        data: {
          status: BiometricJobStatus.FAILED,
          errorMessage: message,
        },
      });
      throw error;
    }
  }

  private serializeBiometricJob(job: {
    id: string;
    type: BiometricJobType;
    status: BiometricJobStatus;
    errorMessage: string | null;
    resultJson: string | null;
    attempts: number;
    createdAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
  }) {
    return {
      id: job.id,
      type: job.type,
      status: job.status,
      errorMessage: job.errorMessage,
      result: job.resultJson ? JSON.parse(job.resultJson) : null,
      attempts: job.attempts,
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt?.toISOString() ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
    };
  }

  private deriveGuidedLivenessScore(captureMetadata: Record<string, unknown> | null) {
    const frameCount = typeof captureMetadata?.frameCount === 'number' ? captureMetadata.frameCount : 0;
    const challengeSteps = Array.isArray(captureMetadata?.challengeSteps)
      ? captureMetadata.challengeSteps.length
      : 0;

    if (frameCount >= 3 && challengeSteps >= 3) {
      return 0.94;
    }

    if (frameCount >= 2 && challengeSteps >= 2) {
      return 0.91;
    }

    return 0.78;
  }

  private async saveArtifacts(params: {
    tenantId: string;
    employeeId: string;
    artifacts: string[];
    captureMetadata: Record<string, unknown> | null;
    kind: BiometricArtifactKind;
  }) {
    const uploadedArtifacts: Array<{ id: string; storageKey: string }> = [];

    if (!this.storageService.isConfigured() || params.artifacts.length === 0) {
      return uploadedArtifacts;
    }

    for (const [index, artifact] of params.artifacts.entries()) {
      const storageKey = `biometric/${params.tenantId}/${params.employeeId}/${params.kind.toLowerCase()}/${Date.now()}-${index}.jpg`;
      let uploadResult: {
        key: string;
        contentType: string;
      };

      try {
        uploadResult = await this.storageService.uploadDataUrl(storageKey, artifact);
      } catch {
        break;
      }

      const record = await this.prisma.biometricArtifact.create({
        data: {
          tenantId: params.tenantId,
          employeeId: params.employeeId,
          kind: params.kind,
          storageKey: uploadResult.key,
          stepId: `step-${index + 1}`,
          contentType: uploadResult.contentType,
          captureMetadataJson: params.captureMetadata ? JSON.stringify(params.captureMetadata) : undefined,
        },
      });

      uploadedArtifacts.push({ id: record.id, storageKey: uploadResult.key });
    }

    return uploadedArtifacts;
  }

  private async saveProviderReferenceArtifact(
    tenantId: string,
    employeeId: string,
    kind: BiometricArtifactKind,
    buffer: Buffer,
    captureMetadata: Record<string, unknown> | null,
  ) {
    const storageKey = `biometric/${tenantId}/${employeeId}/${kind.toLowerCase()}/${Date.now()}-provider-reference.jpg`;
    await this.storageService.uploadBuffer(storageKey, buffer, 'image/jpeg');

    await this.prisma.biometricArtifact.create({
      data: {
        tenantId,
        employeeId,
        kind,
        storageKey,
        stepId: 'provider-reference',
        contentType: 'image/jpeg',
        captureMetadataJson: captureMetadata ? JSON.stringify(captureMetadata) : undefined,
      },
    });

    return storageKey;
  }

  private async resolveBiometricReferenceBytes(reference: string | null | undefined) {
    if (!reference) {
      return null;
    }

    if (this.isInlineBiometricReference(reference)) {
      return this.parseInlineBiometricReference(reference);
    }

    return this.storageService.getObjectBuffer(reference).catch(() => null);
  }

  private resolveBiometricReferenceUrl(reference: string | null | undefined) {
    if (!reference) {
      return null;
    }

    if (this.isInlineBiometricReference(reference)) {
      return reference;
    }

    return this.storageService.getObjectUrl(reference);
  }

  private normalizeBiometricReferenceForAudit(reference: string | null) {
    if (!reference) {
      return null;
    }

    return this.isInlineBiometricReference(reference) ? 'inline-data-url' : reference;
  }

  private isInlineBiometricReference(reference: string | null | undefined): reference is string {
    return typeof reference === 'string' && /^data:image\/[a-z0-9.+-]+;base64,/i.test(reference);
  }

  private parseInlineBiometricReference(reference: string) {
    const match = reference.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
      return null;
    }

    return Buffer.from(match[2], 'base64');
  }

  private assertEnrollmentCanBeStarted(
    profile:
      | {
          enrollmentStatus: BiometricEnrollmentStatus;
          templateRef: string | null;
        }
      | null
      | undefined,
  ) {
    if (
      profile?.enrollmentStatus === BiometricEnrollmentStatus.ENROLLED &&
      profile.templateRef
    ) {
      throw new ForbiddenException(
        'Biometric reference is already registered. Reset the existing enrollment before capturing a new reference.',
      );
    }
  }

  private buildBullConnection(redisUrl: string) {
    const parsed = new URL(redisUrl);
    const db = parsed.pathname ? Number(parsed.pathname.replace('/', '')) : undefined;

    return {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 6379,
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      db: Number.isFinite(db) ? db : undefined,
      family: 0 as const,
      maxRetriesPerRequest: null as null,
    };
  }
}
