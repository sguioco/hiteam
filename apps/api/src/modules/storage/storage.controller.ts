import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';

const IMMUTABLE_MEDIA_CACHE_CONTROL = 'public, max-age=31536000, immutable';

@Controller('media')
export class StorageController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  @Get('task-photo-proofs/:proofId/file')
  async getTaskPhotoProofFile(
    @Param('proofId') proofId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const proof = await this.prisma.taskPhotoProof.findFirst({
      where: {
        id: proofId,
        deletedAt: null,
        supersededByProofId: null,
      },
      select: {
        fileName: true,
        storageKey: true,
      },
    });

    if (!proof) {
      throw new NotFoundException('Photo proof was not found.');
    }

    try {
      const object = await this.storageService.getObject(proof.storageKey);

      response.setHeader('Cache-Control', IMMUTABLE_MEDIA_CACHE_CONTROL);
      response.setHeader('Content-Length', String(object.contentLength));
      response.setHeader('Content-Type', object.contentType);
      response.setHeader('Content-Disposition', this.buildInlineDisposition(proof.fileName));

      if (object.etag) {
        response.setHeader('ETag', object.etag);
      }

      if (object.lastModified) {
        response.setHeader('Last-Modified', object.lastModified.toUTCString());
      }

      return new StreamableFile(object.buffer);
    } catch {
      throw new NotFoundException('Photo file is no longer available.');
    }
  }

  private buildInlineDisposition(fileName: string) {
    const fallbackName = fileName.replace(/["\\\r\n]+/g, '-').trim() || 'task-photo.jpg';
    return `inline; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
  }
}
