import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/supabase/route';
import { badRequest, forbidden, notFound, ok, serverError, unauthorized } from '@/lib/http';
import { canUpload, getFilmWithAccess } from '@/lib/permissions';
import { completeAssetSchema } from '@/lib/validators';
import { fetchFilmDto } from '@/lib/films';

export async function POST(request: NextRequest, { params }: { params: { filmId: string } }) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) return unauthorized();
    const payload = completeAssetSchema.parse(await request.json());
    const supabase = createSupabaseAdminClient();
    const { film, role } = await getFilmWithAccess(supabase, params.filmId, auth.user.id);
    if (!film) return notFound('Film not found.');
    if (!canUpload(role)) return forbidden('You do not have permission to complete asset uploads for this film.');

    const { error } = await supabase
      .from('film_assets')
      .update({ status: 'ready' })
      .eq('id', payload.assetId)
      .eq('film_id', params.filmId);

    if (error) throw error;
    const dto = await fetchFilmDto(supabase, params.filmId);
    return ok({ film: dto });
  } catch (error) {
    if (error instanceof z.ZodError) return badRequest('Invalid asset completion payload.', error.flatten());
    return serverError(error);
  }
}
