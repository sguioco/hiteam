export const DEVICE_PLATFORMS = ['IOS', 'ANDROID', 'WEB'] as const;

export const ANNOUNCEMENT_AUDIENCES = ['ALL', 'GROUP', 'EMPLOYEE', 'DEPARTMENT', 'LOCATION'] as const;

export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as const;

export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export const TASK_TEMPLATE_FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY'] as const;

export const ANNOUNCEMENT_TEMPLATE_FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY'] as const;

export const REQUEST_TYPES = [
  'LEAVE',
  'SICK_LEAVE',
  'VACATION_CHANGE',
  'UNPAID_LEAVE',
  'SHIFT_CHANGE',
  'ADVANCE',
  'SUPPLY',
  'GENERAL',
] as const;
