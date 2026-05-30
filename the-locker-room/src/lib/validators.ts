import { z } from 'zod';
import { VIDEO_QUALITY_OPTIONS } from '@/lib/constants/quality';

const videoQualityValues = VIDEO_QUALITY_OPTIONS.filter((quality) => quality !== 'Auto') as [string, ...string[]];

export const createTeamSchema = z.object({
  name: z.string().trim().min(2).max(120)
});

export const uploadFilmSchema = z.object({
  teamId: z.string().uuid(),
  title: z.string().trim().min(2).max(180),
  opponent: z.string().trim().max(160).optional().nullable(),
  gameDate: z.string().trim().max(30).optional().nullable(),
  venue: z.string().trim().max(180).optional().nullable(),
  competitionLevel: z.string().trim().max(120).optional().nullable(),
  downloadEnabled: z.boolean().default(true),
  video: z.object({
    name: z.string().trim().min(1).max(220),
    type: z.string().trim().min(1).max(120),
    size: z.number().int().positive()
  }),
  subtitle: z
    .object({
      name: z.string().trim().min(1).max(220),
      type: z.string().trim().min(1).max(120),
      size: z.number().int().positive(),
      languageCode: z.string().trim().min(2).max(12)
    })
    .optional()
    .nullable()
});

export const completeFilmSchema = z.object({
  filmId: z.string().uuid(),
  durationSeconds: z.number().nonnegative().optional().nullable(),
  subtitleAssetId: z.string().uuid().optional().nullable()
});

export const playbackRequestSchema = z.object({
  qualityLabel: z.string().trim().max(20).optional().nullable()
});

export const uploadAssetSchema = z.object({
  kind: z.enum(['video', 'subtitle', 'thumbnail']),
  qualityLabel: z.enum(videoQualityValues).optional().nullable(),
  languageCode: z.string().trim().min(2).max(12).optional().nullable(),
  file: z.object({
    name: z.string().trim().min(1).max(220),
    type: z.string().trim().min(1).max(120),
    size: z.number().int().positive()
  })
});

export const completeAssetSchema = z.object({
  assetId: z.string().uuid()
});

export const notificationRecipientSchema = z.object({
  email: z.string().trim().email().max(254),
  events: z.array(z.enum(['upload', 'view', 'download', 'recording'])).min(1),
  enabled: z.boolean().default(true)
});

export const recordingEventSchema = z.object({
  startedAt: z.string().optional(),
  endedAt: z.string().optional(),
  seconds: z.number().nonnegative().optional(),
  mimeType: z.string().optional()
});
