import { SetMetadata } from '@nestjs/common';

export const REQUIRED_STATUSES_KEY = 'required_statuses';
export const RequiredStatuses = (...statuses: string[]) => SetMetadata(REQUIRED_STATUSES_KEY, statuses);
