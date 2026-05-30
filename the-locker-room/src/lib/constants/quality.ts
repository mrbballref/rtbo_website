export const VIDEO_QUALITY_OPTIONS = [
  'Auto',
  '240p',
  '360p',
  '480p',
  '720p60',
  '1080p60',
  '1440p60'
] as const;

export type VideoQuality = (typeof VIDEO_QUALITY_OPTIONS)[number];

export const PLAYBACK_SPEED_OPTIONS = [
  { label: 'Normal x1', value: 1 },
  { label: 'x1.5', value: 1.5 },
  { label: 'x2', value: 2 },
  { label: 'x2.5', value: 2.5 },
  { label: 'x3', value: 3 },
  { label: 'x3.5', value: 3.5 },
  { label: 'x4', value: 4 },
  { label: 'x5', value: 5 },
  { label: '-1 Reverse', value: -1 },
  { label: '-1.5 Reverse', value: -1.5 },
  { label: '-2 Reverse', value: -2 },
  { label: '-2.5 Reverse', value: -2.5 },
  { label: '-3 Reverse', value: -3 },
  { label: '-3.5 Reverse', value: -3.5 },
  { label: '-4 Reverse', value: -4 },
  { label: '-4.5 Reverse', value: -4.5 },
  { label: '-5 Reverse', value: -5 }
] as const;
