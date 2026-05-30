import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/supabase/route';
import { badRequest, forbidden, notFound, ok, serverError, unauthorized } from '@/lib/http';
import { canUpload, getFilmWithAccess } from '@/lib/permissions';
import { uploadAssetSchema } from '@/lib/validators';
import { safeFileName } from '@/lib/format';

export async function POST(request: NextRequest, { params }: { params: { filmId: string } }) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) return unauthorized();
    const payload = uploadAssetSchema.parse(await request.json());
    const supabase = createSupabaseAdminClient();
    const { film, role } = await getFilmWithAccess(supabase, params.filmId, auth.user.id);
    if (!film) return notFound('Film not found.');
    if (!canUpload(role)) return forbidden('You do not have permission to upload assets for this film.');

    if (payload.kind === 'video' && !payload.qualityLabel) {
      return badRequest('qualityLabel is required for video quality assets.');
    }
    if (payload.kind === 'subtitle' && !payload.languageCode) {
      return badRequest('languageCode is required for subtitle assets.');
    }

    const assetId = crypto.randomUUID();
    const safeName = safeFileName(payload.file.name);
    const family = payload.kind === 'video' ? `qualities/${payload.qualityLabel}` : payload.kind === 'subtitle' ? `subtitles/${payload.languageCode}` : 'thumbnails';
    const path = `teams/${film.team_id}/films/${film.id}/${family}/${Date.now()}-${safeName}`;

    const { error: assetError } = await supabase.from('film_assets').insert({
      id: assetId,
      film_id: film.id,
      kind: payload.kind,
      status: 'uploading',
      storage_bucket: film.storage_bucket,
      storage_path: path,
      quality_label: payload.kind === 'video' ? payload.qualityLabel ?? null : null,
      language_code: payload.kind === 'subtitle' ? payload.languageCode ?? null : null,
      original_filename: payload.file.name,
      mime_type: payload.file.type,
      size_bytes: payload.file.size,
      created_by: auth.user.id
    });

    if (assetError) throw assetError;

    const { data: target, error: signedError } = await supabase.storage
      .from(film.storage_bucket)
      .createSignedUploadUrl(path);

    if (signedError) throw signedError;
    return ok({ assetId, bucket: film.storage_bucket, target: { ...target, bucket: film.storage_bucket, assetId } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return badRequest('Invalid asset upload request.', error.flatten());
    return serverError(error);
  }
}
