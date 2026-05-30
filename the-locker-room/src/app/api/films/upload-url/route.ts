import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/supabase/route';
import { badRequest, forbidden, ok, serverError, unauthorized } from '@/lib/http';
import { getFilmBucket } from '@/lib/env';
import { safeFileName } from '@/lib/format';
import { requireTeamRole } from '@/lib/permissions';
import { uploadFilmSchema } from '@/lib/validators';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) return unauthorized();

    const payload = uploadFilmSchema.parse(await request.json());
    const supabase = createSupabaseAdminClient();
    const permission = await requireTeamRole(supabase, payload.teamId, auth.user.id, ['owner', 'admin', 'uploader']);
    if (!permission.allowed) return forbidden('You do not have upload access for this team.');

    const bucket = getFilmBucket();
    const filmId = crypto.randomUUID();
    const videoName = safeFileName(payload.video.name);
    const videoPath = `teams/${payload.teamId}/films/${filmId}/source/${Date.now()}-${videoName}`;

    const { data: film, error: filmError } = await supabase
      .from('game_films')
      .insert({
        id: filmId,
        team_id: payload.teamId,
        title: payload.title,
        opponent: payload.opponent || null,
        game_date: payload.gameDate || null,
        venue: payload.venue || null,
        competition_level: payload.competitionLevel || null,
        storage_bucket: bucket,
        storage_path: videoPath,
        status: 'uploading',
        download_enabled: payload.downloadEnabled,
        original_filename: payload.video.name,
        mime_type: payload.video.type,
        size_bytes: payload.video.size,
        uploaded_by: auth.user.id
      })
      .select('id')
      .single();

    if (filmError) throw filmError;

    const { data: videoUpload, error: uploadError } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(videoPath);

    if (uploadError) throw uploadError;

    let subtitleTarget = null;
    if (payload.subtitle) {
      const subtitleId = crypto.randomUUID();
      const subtitleName = safeFileName(payload.subtitle.name);
      const subtitlePath = `teams/${payload.teamId}/films/${film.id}/subtitles/${payload.subtitle.languageCode}/${Date.now()}-${subtitleName}`;

      const { error: assetError } = await supabase.from('film_assets').insert({
        id: subtitleId,
        film_id: film.id,
        kind: 'subtitle',
        status: 'uploading',
        storage_bucket: bucket,
        storage_path: subtitlePath,
        language_code: payload.subtitle.languageCode,
        original_filename: payload.subtitle.name,
        mime_type: payload.subtitle.type,
        size_bytes: payload.subtitle.size,
        created_by: auth.user.id
      });

      if (assetError) throw assetError;

      const { data: subtitleUpload, error: subtitleUploadError } = await supabase.storage
        .from(bucket)
        .createSignedUploadUrl(subtitlePath);

      if (subtitleUploadError) throw subtitleUploadError;
      subtitleTarget = { ...subtitleUpload, bucket, assetId: subtitleId };
    }

    return ok(
      {
        filmId: film.id,
        bucket,
        video: { ...videoUpload, bucket },
        subtitle: subtitleTarget
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) return badRequest('Invalid upload request.', error.flatten());
    return serverError(error);
  }
}
