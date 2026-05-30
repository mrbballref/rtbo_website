import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/db-types';
import type { TeamRole } from '@/types/locker-room';

export async function getTeamRole(
  supabase: SupabaseClient<Database>,
  teamId: string,
  userId: string
): Promise<TeamRole | null> {
  const { data, error } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data?.role ?? null;
}

export async function requireTeamRole(
  supabase: SupabaseClient<Database>,
  teamId: string,
  userId: string,
  roles: TeamRole[]
) {
  const role = await getTeamRole(supabase, teamId, userId);
  if (!role || !roles.includes(role)) {
    return { allowed: false as const, role };
  }
  return { allowed: true as const, role };
}

export async function getFilmWithAccess(
  supabase: SupabaseClient<Database>,
  filmId: string,
  userId: string
) {
  const { data: film, error: filmError } = await supabase
    .from('game_films')
    .select('*')
    .eq('id', filmId)
    .maybeSingle();

  if (filmError) throw filmError;
  if (!film) return { film: null, role: null };

  const role = await getTeamRole(supabase, film.team_id, userId);
  return { film, role };
}

export function canManage(role: TeamRole | null) {
  return role === 'owner' || role === 'admin';
}

export function canUpload(role: TeamRole | null) {
  return role === 'owner' || role === 'admin' || role === 'uploader';
}

export function canView(role: TeamRole | null) {
  return Boolean(role);
}
