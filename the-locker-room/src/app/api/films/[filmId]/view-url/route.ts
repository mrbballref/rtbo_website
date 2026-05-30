import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/supabase/route';
import { badRequest, forbidden, notFound, ok, serverError, unauthorized } from '@/lib/http';
import { canView, getFilmWithAccess } from '@/lib/permissions';
import { playbackRequestSchema } from '@/lib/validators';
import { fetchFilmDto, subtitleLabel } from '@/lib/films';
import { logFilmEvent } from '@/lib/events';
import { notifyFilmEvent } from '@/lib/notifications';

const PLAYBACK_URL_SECONDS = 60 * 60;

export async function POST(request: NextRequest, { params }: { params: { filmId: string } }) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) return unauthorized();
    const payload = playbackRequestSchema.parse(await request.json().catch(() => ({})));
    const supabase = createSupabaseAdminClient();
    const { film, role } = await getFilmWithAccess(supabase, params.filmId, auth.user.id);
    if (!film) return notFound('Film not found.');
    if (!canView(role)) return forbidden('You do not have access to this game film.');
    if (film.status !== 'ready') return badRequest('This film is not ready for playback yet.');

    let storagePath = film.storage_path;
    let selectedQuality = 'Auto';

    if (payload.qualityLabel && payload.qualityLabel !== 'Auto' && payload.qualityLabel !== 'Original') {
      const { data: asset, error: assetError } = await supabase
        .from('film_assets')
        .select('storage_path, storage_bucket, quality_label')
        .eq('film_id', params.filmId)
        .eq('kind', 'video')
        .eq('status', 'ready')
        .eq('quality_label', payload.qualityLabel)
        .maybeSingle();

      if (assetError) throw assetError;
      if (!asset) return notFound(`No ${payload.qualityLabel} video asset has been uploaded for this film.`);
      storagePath = asset.storage_path;
      selectedQuality = asset.quality_label ?? payload.qualityLabel;
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from(film.storage_bucket)
      .createSignedUrl(storagePath, PLAYBACK_URL_SECONDS);

    if (signedError) throw signedError;

    const { data: subtitleAssets, error: subtitlesError } = await supabase
      .from('film_assets')
      .select('id, storage_bucket, storage_path, language_code')
      .eq('film_id', params.filmId)
      .eq('kind', 'subtitle')
      .eq('status', 'ready');

    if (subtitlesError) throw subtitlesError;

    const subtitles = [];
    for (const asset of subtitleAssets ?? []) {
      const { data: signedSubtitle, error: subtitleError } = await supabase.storage
        .from(asset.storage_bucket)
        .createSignedUrl(asset.storage_path, PLAYBACK_URL_SECONDS);
      if (!subtitleError && signedSubtitle?.signedUrl) {
        subtitles.push({
          id: asset.id,
          src: signedSubtitle.signedUrl,
          languageCode: asset.language_code ?? 'en',
          label: subtitleLabel(asset.language_code)
        });
      }
    }

    await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<unknown>)(
      'increment_film_view',
      { p_film_id: params.filmId }
    );

    await logFilmEvent(supabase, request, {
      filmId: params.filmId,
      actorId: auth.user.id,
      eventType: 'view',
      metadata: { qualityLabel: selectedQuality }
    });
    await notifyFilmEvent(supabase, { filmId: params.filmId, eventType: 'view', actor: auth.user }).catch(console.error);

    const dto = await fetchFilmDto(supabase, params.filmId);
    return ok({
      signedUrl: signed.signedUrl,
      expiresIn: PLAYBACK_URL_SECONDS,
      film: dto,
      selectedQuality,
      subtitles
    });
  } catch (error) {
    if (error instanceof z.ZodError) return badRequest('Invalid playback request.', error.flatten());
    return serverError(error);
  }
}
