import { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/supabase/route';
import { badRequest, forbidden, notFound, ok, serverError, unauthorized } from '@/lib/http';
import { canView, getFilmWithAccess } from '@/lib/permissions';
import { logFilmEvent } from '@/lib/events';
import { notifyFilmEvent } from '@/lib/notifications';

const DOWNLOAD_URL_SECONDS = 10 * 60;

export async function POST(request: NextRequest, { params }: { params: { filmId: string } }) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) return unauthorized();
    const supabase = createSupabaseAdminClient();
    const { film, role } = await getFilmWithAccess(supabase, params.filmId, auth.user.id);
    if (!film) return notFound('Film not found.');
    if (!canView(role)) return forbidden('You do not have access to this game film.');
    if (film.status !== 'ready') return badRequest('This film is not ready for download yet.');
    if (!film.download_enabled) return forbidden('Downloads are disabled for this game film.');

    const { data: signed, error: signedError } = await supabase.storage
      .from(film.storage_bucket)
      .createSignedUrl(film.storage_path, DOWNLOAD_URL_SECONDS, { download: film.original_filename });

    if (signedError) throw signedError;

    await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<unknown>)(
      'increment_film_download',
      { p_film_id: params.filmId }
    );

    await logFilmEvent(supabase, request, {
      filmId: params.filmId,
      actorId: auth.user.id,
      eventType: 'download'
    });
    await notifyFilmEvent(supabase, { filmId: params.filmId, eventType: 'download', actor: auth.user }).catch(console.error);

    return ok({ signedUrl: signed.signedUrl, expiresIn: DOWNLOAD_URL_SECONDS, filename: film.original_filename });
  } catch (error) {
    return serverError(error);
  }
}
