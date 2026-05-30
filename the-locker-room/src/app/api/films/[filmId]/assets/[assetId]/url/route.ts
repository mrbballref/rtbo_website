import { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/supabase/route';
import { forbidden, notFound, ok, serverError, unauthorized } from '@/lib/http';
import { canView, getFilmWithAccess } from '@/lib/permissions';

const ASSET_URL_SECONDS = 60 * 30;

export async function POST(
  request: NextRequest,
  { params }: { params: { filmId: string; assetId: string } }
) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) return unauthorized();
    const supabase = createSupabaseAdminClient();
    const { film, role } = await getFilmWithAccess(supabase, params.filmId, auth.user.id);
    if (!film) return notFound('Film not found.');
    if (!canView(role)) return forbidden('You do not have access to this game film.');

    const { data: asset, error: assetError } = await supabase
      .from('film_assets')
      .select('*')
      .eq('id', params.assetId)
      .eq('film_id', params.filmId)
      .eq('status', 'ready')
      .maybeSingle();

    if (assetError) throw assetError;
    if (!asset) return notFound('Asset not found.');

    const { data: signed, error: signedError } = await supabase.storage
      .from(asset.storage_bucket)
      .createSignedUrl(asset.storage_path, ASSET_URL_SECONDS);

    if (signedError) throw signedError;
    return ok({ signedUrl: signed.signedUrl, expiresIn: ASSET_URL_SECONDS });
  } catch (error) {
    return serverError(error);
  }
}
