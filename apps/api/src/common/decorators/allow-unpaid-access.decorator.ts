import { SetMetadata } from '@nestjs/common';

export const ALLOW_UNPAID_ACCESS_KEY = 'allowUnpaidAccess';
// Account management must remain available after service access expires.
export const AllowUnpaidAccess = () => SetMetadata(ALLOW_UNPAID_ACCESS_KEY, true);
