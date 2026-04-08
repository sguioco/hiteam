import { SetMetadata } from '@nestjs/common';

export const ALLOW_PENDING_ACCESS_KEY = 'allowPendingAccess';
export const AllowPendingAccess = () => SetMetadata(ALLOW_PENDING_ACCESS_KEY, true);
