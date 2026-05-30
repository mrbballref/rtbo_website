import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/supabase/route';
import { badRequest, forbidden, notFound, ok, serverError, unauthorized } from '@/lib/http';
import { canView, getFilmWithAccess } from '@/lib/permissions';
import { recordingEventSchema } from '@/lib/validators';
import { logFilmEvent } from '@/lib/events';

export async function POST(request: NextRequest, { params }: { params: { filmId: string } }) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) return unauthorized();
    const payload = recordingEventSchema.parse(await request.json().catch(() => ({})));
    const supabase = createSupabaseAdminClient();
    const { film, role } = await getFilmWithAccess(supabase, params.filmId, auth.user.id);
    if (!film) return notFound('Film not found.');
    if (!canView(role)) return forbidden('You do not have access to this game film.');

    await logFilmEvent(supabase, request, {
      filmId: params.filmId,
      actorId: auth.user.id,
      eventType: 'recording',
      metadata: payload
    });

    return ok({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return badRequest('Invalid recording event payload.', error.flatten());
    return serverError(error);
  }
}
