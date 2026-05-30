import { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/supabase/route';
import { badRequest, forbidden, ok, serverError, unauthorized } from '@/lib/http';
import { FILM_SELECT, toGameFilm } from '@/lib/films';
import { requireTeamRole } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) return unauthorized();

    const teamId = request.nextUrl.searchParams.get('teamId');
    if (!teamId) return badRequest('teamId is required.');

    const supabase = createSupabaseAdminClient();
    const permission = await requireTeamRole(supabase, teamId, auth.user.id, ['owner', 'admin', 'uploader', 'viewer']);
    if (!permission.allowed) return forbidden('You are not a member of this team.');

    const { data, error } = await supabase
      .from('game_films')
      .select(FILM_SELECT)
      .eq('team_id', teamId)
      .neq('status', 'archived')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return ok({ films: (data ?? []).map((row: unknown) => toGameFilm(row as Parameters<typeof toGameFilm>[0])) });
  } catch (error) {
    return serverError(error);
  }
}
