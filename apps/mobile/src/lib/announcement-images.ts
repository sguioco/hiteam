import type { AnnouncementImageAspectRatio } from '@smart/types';

export const ANNOUNCEMENT_IMAGE_ASPECT_RATIO_OPTIONS: Array<{
  key: AnnouncementImageAspectRatio;
  label: string;
}> = [
  { key: '16:9', label: '16:9' },
  { key: '4:3', label: '4:3' },
  { key: '1:1', label: '1:1' },
];

export function announcementAspectRatioToNumber(
  value?: AnnouncementImageAspectRatio | null,
) {
  switch (value) {
    case '1:1':
      return 1;
    case '4:3':
      return 4 / 3;
    case '16:9':
    default:
      return 16 / 9;
  }
}
