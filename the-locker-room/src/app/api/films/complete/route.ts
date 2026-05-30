import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/supabase/route';
import { badRequest, forbidden, notFound, ok, serverError, unauthorized } from '@/lib/http';
import { completeFilmSchema } from '@/lib/validators';
import { canUpload, getFilmWithAccess } from '@/lib/permissions';
import { fetchFilmDto } from '@/lib/films';
import { logFilmEvent } from '@/lib/events';
import { notifyFilmEvent } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) return unauthorized();
    const payload = completeFilmSchema.parse(await request.json());
    const supabase = createSupabaseAdminClient();
    const { film, role } = await getFilmWithAccess(supabase, payload.filmId, auth.user.id);
    if (!film) return notFound('Film not found.');
    if (!canUpload(role)) return forbidden('You do not have permission to complete this upload.');

    const { error } = await supabase
      .from('game_films')
      .update({
        status: 'ready',
        duration_seconds: payload.durationSeconds ?? null
      })
      .eq('id', payload.filmId);

    if (error) throw error;

    if (payload.subtitleAssetId) {
      const { error: assetError } = await supabase
        .from('film_assets')
        .update({ status: 'ready' })
        .eq('id', payload.subtitleAssetId)
        .eq('film_id', payload.filmId);
      if (assetError) throw assetError;
    }

    await logFilmEvent(supabase, request, {
      filmId: payload.filmId,
      actorId: auth.user.id,
      eventType: 'upload',
      metadata: { durationSeconds: payload.durationSeconds ?? null }
    });
    await notifyFilmEvent(supabase, { filmId: payload.filmId, eventType: 'upload', actor: auth.user }).catch(console.error);

    const dto = await fetchFilmDto(supabase, payload.filmId);
    return ok({ film: dto });
  } catch (error) {
    if (error instanceof z.ZodError) return badRequest('Invalid completion payload.', error.flatten());
    return serverError(error);
  }
}
