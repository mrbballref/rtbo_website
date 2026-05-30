import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/supabase/route';
import { badRequest, forbidden, ok, serverError, unauthorized } from '@/lib/http';
import { notificationRecipientSchema } from '@/lib/validators';
import { requireTeamRole } from '@/lib/permissions';

export async function GET(request: NextRequest, { params }: { params: { teamId: string } }) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) return unauthorized();
    const supabase = createSupabaseAdminClient();
    const permission = await requireTeamRole(supabase, params.teamId, auth.user.id, ['owner', 'admin']);
    if (!permission.allowed) return forbidden('Only team owners and admins can manage notification recipients.');

    const { data, error } = await supabase
      .from('notification_recipients')
      .select('id, team_id, email, events, enabled, created_at')
      .eq('team_id', params.teamId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return ok({ recipients: data ?? [] });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: { teamId: string } }) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) return unauthorized();
    const payload = notificationRecipientSchema.parse(await request.json());
    const supabase = createSupabaseAdminClient();
    const permission = await requireTeamRole(supabase, params.teamId, auth.user.id, ['owner', 'admin']);
    if (!permission.allowed) return forbidden('Only team owners and admins can manage notification recipients.');

    const { data, error } = await supabase
      .from('notification_recipients')
      .insert({
        team_id: params.teamId,
        email: payload.email,
        events: payload.events,
        enabled: payload.enabled,
        created_by: auth.user.id
      })
      .select('id, team_id, email, events, enabled, created_at')
      .single();

    if (error) throw error;
    return ok({ recipient: data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return badRequest('Invalid notification recipient payload.', error.flatten());
    return serverError(error);
  }
}
