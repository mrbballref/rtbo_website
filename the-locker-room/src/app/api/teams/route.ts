import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/supabase/route';
import { badRequest, ok, serverError, unauthorized } from '@/lib/http';
import { createTeamSchema } from '@/lib/validators';
import { slugify } from '@/lib/format';
import type { TeamRole } from '@/types/locker-room';

type JoinedTeam = { id: string; name: string; slug: string; created_at: string };
type TeamMemberJoin = { teams: JoinedTeam | JoinedTeam[] | null; role: TeamRole };

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) return unauthorized();

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('team_members')
      .select('role, teams(id, name, slug, created_at)')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const teams = (data ?? [])
      .map((row: TeamMemberJoin) => {
        const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;
        if (!team) return null;
        return {
          id: team.id,
          name: team.name,
          slug: team.slug,
          created_at: team.created_at,
          role: row.role
        };
      })
      .filter(Boolean);

    return ok({ teams });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) return unauthorized();

    const payload = createTeamSchema.parse(await request.json());
    const supabase = createSupabaseAdminClient();
    const baseSlug = slugify(payload.name) || 'team';
    const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({ name: payload.name, slug, created_by: auth.user.id })
      .select('id, name, slug, created_at')
      .single();

    if (teamError) throw teamError;

    const { error: memberError } = await supabase.from('team_members').insert({
      team_id: team.id,
      user_id: auth.user.id,
      role: 'owner'
    });

    if (memberError) throw memberError;

    return ok({ team: { ...team, role: 'owner' } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return badRequest('Invalid team payload.', error.flatten());
    return serverError(error);
  }
}
