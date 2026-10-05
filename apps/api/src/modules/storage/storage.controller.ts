import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { StorageService } from './storage.service';
import { TaskPhotoAccessService } from './task-photo-access.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';

const PRIVATE_MEDIA_CACHE_CONTROL = 'private, no-store';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class StorageController {
  constructor(
    private readonly access: TaskPhotoAccessService,
    private readonly storageService: StorageService,
  ) {}

  @Get('task-photo-proofs/:proofId/file')
  async getTaskPhotoProofFile(
    @CurrentUser() user: JwtUser,
    @Param('proofId') proofId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const proof = await this.access.findReadableProof(user, proofId);

    try {
      const object = await this.storageService.getObject(proof.storageKey);

      response.setHeader('Cache-Control', PRIVATE_MEDIA_CACHE_CONTROL);
      response.setHeader('Vary', 'Authorization');
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
    } catch (error) {
      if (error instanceof Error && ['NoSuchKey', 'NotFound'].includes(error.name)) {
        throw new NotFoundException('Photo file is no longer available.');
      }
      throw error;
    }
  }

  private buildInlineDisposition(fileName: string) {
    const fallbackName = fileName.replace(/["\\\r\n]+/g, '-').trim() || 'task-photo.jpg';
    return `inline; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
  }
}
