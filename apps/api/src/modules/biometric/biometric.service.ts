import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BiometricArtifactKind,
  BiometricEnrollmentStatus,
  BiometricJobStatus,
  BiometricJobType,
  BiometricManualReviewStatus,
  BiometricVerificationResult,
  NotificationType,
} from '@prisma/client';
import { Job, Queue, Worker } from 'bullmq';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { NotificationsService } from '../notifications/notifications.service';
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
  private queue: Queue | null = null;
  private worker: Worker | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly storageService: StorageService,
    private readonly biometricProviderService: BiometricProviderService,
    private readonly notificationsService: NotificationsService,
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

    return {
      employeeId: employee.id,
      enrollmentStatus: employee.biometricProfile?.enrollmentStatus ?? BiometricEnrollmentStatus.NOT_STARTED,
      provider: employee.biometricProfile?.provider ?? this.biometricProviderService.getProviderName(),
      rules: {
        enrollmentRequired: true,
        livenessRequired: true,
        faceMatchRequired: true,
        auditEnabled: true,
      },
    };
  }

  async startEnrollment(userId: string, dto: StartEnrollmentDto) {
    const employee = await this.prisma.employee.findUniqueOrThrow({ where: { userId } });

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
    const employee = await this.prisma.employee.findUniqueOrThrow({ where: { userId } });

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
    const employee = await this.prisma.employee.findUniqueOrThrow({ where: { userId } });
    const awsSessionId =
      typeof dto.captureMetadata?.awsLivenessSessionId === 'string'
        ? dto.captureMetadata.awsLivenessSessionId
        : null;
    const awsLivenessResult = awsSessionId
      ? await this.biometricProviderService.getLivenessSessionResult(awsSessionId)
      : null;
    const uploadedArtifacts = await this.saveArtifacts({
      tenantId: employee.tenantId,
      employeeId: employee.id,
      artifacts: dto.artifacts ?? [],
      captureMetadata: dto.captureMetadata ?? null,
      kind: BiometricArtifactKind.ENROLLMENT,
    });
    const providerReferenceKey =
      awsLivenessResult?.referenceImageBytes && this.storageService.isConfigured()
        ? await this.saveProviderReferenceArtifact(
            employee.tenantId,
            employee.id,
            BiometricArtifactKind.ENROLLMENT,
            awsLivenessResult.referenceImageBytes,
            dto.captureMetadata ?? null,
          )
        : null;
    const templateRef = providerReferenceKey ?? uploadedArtifacts[0]?.storageKey ?? dto.templateRef;
    const livenessScore = awsLivenessResult?.confidence ?? dto.livenessScore ?? null;

    const profile = await this.prisma.biometricProfile.upsert({
      where: { employeeId: employee.id },
      update: {
        enrollmentStatus: BiometricEnrollmentStatus.ENROLLED,
        templateRef,
        enrolledAt: new Date(),
        lastVerifiedAt: new Date(),
        provider: this.biometricProviderService.getProviderName(),
      },
      create: {
        employeeId: employee.id,
        enrollmentStatus: BiometricEnrollmentStatus.ENROLLED,
        templateRef,
        enrolledAt: new Date(),
        lastVerifiedAt: new Date(),
        provider: this.biometricProviderService.getProviderName(),
      },
    });

    await this.auditService.log({
      tenantId: employee.tenantId,
      actorUserId: userId,
      entityType: 'biometric_profile',
      entityId: profile.id,
      action: 'biometric.enrollment_completed',
      metadata: {
        templateRef,
        livenessScore,
        captureMetadata: dto.captureMetadata ?? null,
        artifactKeys: uploadedArtifacts.map((item) => item.storageKey),
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

    if (
      verification.result === BiometricVerificationResult.REVIEW &&
      verification.manualReviewStatus === BiometricManualReviewStatus.APPROVED
    ) {
      return verification;
    }

    if (
      verification.result === BiometricVerificationResult.REVIEW &&
      verification.manualReviewStatus === BiometricManualReviewStatus.PENDING
    ) {
      throw new ForbiddenException('Biometric verification is pending manual review.');
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
    const awsLivenessResult = awsSessionId
      ? await this.biometricProviderService.getLivenessSessionResult(awsSessionId)
      : null;
    const providerReferenceKey =
      awsLivenessResult?.referenceImageBytes && this.storageService.isConfigured()
        ? await this.saveProviderReferenceArtifact(
            employee.tenantId,
            employee.id,
            BiometricArtifactKind.VERIFICATION,
            awsLivenessResult.referenceImageBytes,
            dto.captureMetadata ?? null,
          )
        : null;
    const targetArtifactKey = providerReferenceKey ?? uploadedArtifacts[0]?.storageKey ?? null;
    const templateRef = employee.biometricProfile.templateRef;
    const [sourceBytes, targetBytes, providerLivenessScore] = await Promise.all([
      templateRef ? this.storageService.getObjectBuffer(templateRef).catch(() => null) : Promise.resolve(null),
      targetArtifactKey ? this.storageService.getObjectBuffer(targetArtifactKey).catch(() => null) : Promise.resolve(null),
      Promise.resolve(awsLivenessResult?.confidence ?? null),
    ]);

    const fallbackLivenessScore = this.deriveGuidedLivenessScore(dto.captureMetadata ?? null);
    const providerMatchScore =
      sourceBytes && targetBytes
        ? await this.biometricProviderService.compareFaces(sourceBytes, targetBytes)
        : null;
    const livenessScore = providerLivenessScore ?? fallbackLivenessScore;
    const matchScore = providerMatchScore ?? 0.96;
    const result =
      livenessScore >= 0.9 && matchScore >= 0.9
        ? BiometricVerificationResult.PASSED
        : BiometricVerificationResult.REVIEW;

    const verification = await this.prisma.biometricVerification.create({
      data: {
        employeeId: employee.id,
        attendanceEventId: dto.attendanceEventId,
        result,
        manualReviewStatus: result === BiometricVerificationResult.REVIEW ? BiometricManualReviewStatus.PENDING : null,
        livenessScore,
        matchScore,
        reviewReason: result === BiometricVerificationResult.REVIEW ? 'Threshold not met' : null,
        provider: this.biometricProviderService.getProviderName(),
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
        provider: this.biometricProviderService.getProviderName(),
        awsLivenessSessionId: awsSessionId,
      },
    });

    if (result === BiometricVerificationResult.REVIEW) {
      await this.notifyManualReviewRequired({
        tenantId: employee.tenantId,
        employeeId: employee.id,
        verificationId: verification.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
      });
    }

    return {
      verificationId: verification.id,
      result,
      livenessScore,
      matchScore,
    };
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
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 20) : 8;
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
            templateRef: employee.biometricProfile.templateRef,
            templateUrl: employee.biometricProfile.templateRef
              ? this.storageService.getObjectUrl(employee.biometricProfile.templateRef)
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
    const rows = await this.prisma.biometricVerification.findMany({
      where: {
        employee: { tenantId },
        manualReviewStatus: BiometricManualReviewStatus.PENDING,
      },
      orderBy: { capturedAt: 'desc' },
      include: {
        employee: {
          include: {
            department: true,
            primaryLocation: true,
          },
        },
        artifacts: {
          orderBy: { createdAt: 'asc' },
        },
        attendanceEvent: true,
      },
    });

    return {
      items: rows.map((row) => ({
        verificationId: row.id,
        employeeId: row.employee.id,
        employeeName: `${row.employee.firstName} ${row.employee.lastName}`,
        employeeNumber: row.employee.employeeNumber,
        department: row.employee.department.name,
        location: row.employee.primaryLocation.name,
        provider: row.provider,
        result: row.result,
        manualReviewStatus: row.manualReviewStatus,
        livenessScore: row.livenessScore,
        matchScore: row.matchScore,
        reviewReason: row.reviewReason,
        capturedAt: row.capturedAt.toISOString(),
        attendanceEvent: row.attendanceEvent
          ? {
              id: row.attendanceEvent.id,
              eventType: row.attendanceEvent.eventType,
              occurredAt: row.attendanceEvent.occurredAt.toISOString(),
            }
          : null,
        artifacts: row.artifacts.map((artifact) => ({
          id: artifact.id,
          kind: artifact.kind,
          stepId: artifact.stepId,
          url: this.storageService.getObjectUrl(artifact.storageKey),
        })),
      })),
    };
  }

  async reviewVerification(user: JwtUser, verificationId: string, dto: ReviewBiometricVerificationDto) {
    const verification = await this.prisma.biometricVerification.findFirst({
      where: {
        id: verificationId,
        employee: {
          tenantId: user.tenantId,
        },
      },
      include: {
        employee: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!verification) {
      throw new NotFoundException('Biometric verification not found.');
    }

    if (verification.manualReviewStatus !== BiometricManualReviewStatus.PENDING) {
      throw new ForbiddenException('This biometric verification is not pending manual review.');
    }

    const reviewerEmployee = await this.prisma.employee.findUnique({
      where: { userId: user.sub },
      select: { id: true, firstName: true, lastName: true },
    });

    const manualReviewStatus =
      dto.decision === 'APPROVE' ? BiometricManualReviewStatus.APPROVED : BiometricManualReviewStatus.REJECTED;

    const updated = await this.prisma.biometricVerification.update({
      where: { id: verification.id },
      data: {
        manualReviewStatus,
        reviewedAt: new Date(),
        reviewerComment: dto.comment ?? null,
        reviewerEmployeeId: reviewerEmployee?.id ?? null,
      },
      include: {
        reviewerEmployee: true,
      },
    });

    await this.auditService.log({
      tenantId: verification.employee.tenantId,
      actorUserId: user.sub,
      entityType: 'biometric_verification',
      entityId: verification.id,
      action: dto.decision === 'APPROVE' ? 'biometric.review_approved' : 'biometric.review_rejected',
      metadata: {
        reviewerEmployeeId: reviewerEmployee?.id ?? null,
        comment: dto.comment ?? null,
        automatedResult: verification.result,
      },
    });

    await this.notificationsService.createForUser({
      tenantId: verification.employee.tenantId,
      userId: verification.employee.userId,
      type:
        dto.decision === 'APPROVE'
          ? NotificationType.BIOMETRIC_REVIEW_APPROVED
          : NotificationType.BIOMETRIC_REVIEW_REJECTED,
      title:
        dto.decision === 'APPROVE'
          ? 'Biometric review approved'
          : 'Biometric review rejected',
      body:
        dto.decision === 'APPROVE'
          ? 'Your biometric verification was approved by management.'
          : 'Your biometric verification requires a new capture.',
      actionUrl: '/employee/biometric',
      metadata: {
        verificationId: verification.id,
        decision: dto.decision,
      },
    });

    return {
      verificationId: updated.id,
      manualReviewStatus: updated.manualReviewStatus,
      reviewedAt: updated.reviewedAt?.toISOString() ?? null,
      reviewerEmployee: updated.reviewerEmployee
        ? {
            id: updated.reviewerEmployee.id,
            firstName: updated.reviewerEmployee.firstName,
            lastName: updated.reviewerEmployee.lastName,
          }
        : null,
    };
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

  private async notifyManualReviewRequired(params: {
    tenantId: string;
    employeeId: string;
    verificationId: string;
    employeeName: string;
  }) {
    const reviewerUsers = await this.prisma.userRole.findMany({
      where: {
        scopeType: 'tenant',
        scopeId: params.tenantId,
        role: {
          code: {
            in: ['tenant_owner', 'hr_admin', 'operations_admin', 'manager'],
          },
        },
        user: {
          employee: {
            id: {
              not: params.employeeId,
            },
          },
        },
      },
      include: {
        user: true,
        role: true,
      },
    });

    const uniqueUserIds = [...new Set(reviewerUsers.map((item) => item.userId))];

    await Promise.all(
      uniqueUserIds.map((userId) =>
        this.notificationsService.createForUser({
          tenantId: params.tenantId,
          userId,
          type: NotificationType.BIOMETRIC_REVIEW_ACTION_REQUIRED,
          title: 'Biometric review required',
          body: `${params.employeeName} has a biometric verification that requires manual review.`,
          actionUrl: '/biometric',
          metadata: {
            verificationId: params.verificationId,
            employeeId: params.employeeId,
          },
        }),
      ),
    );
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
