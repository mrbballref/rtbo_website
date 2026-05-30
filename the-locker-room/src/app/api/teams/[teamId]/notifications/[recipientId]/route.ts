import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/supabase/route';
import { badRequest, forbidden, ok, serverError, unauthorized } from '@/lib/http';
import { notificationRecipientSchema } from '@/lib/validators';
import { requireTeamRole } from '@/lib/permissions';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { teamId: string; recipientId: string } }
) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) return unauthorized();
    const payload = notificationRecipientSchema.partial().parse(await request.json());
    const supabase = createSupabaseAdminClient();
    const permission = await requireTeamRole(supabase, params.teamId, auth.user.id, ['owner', 'admin']);
    if (!permission.allowed) return forbidden('Only team owners and admins can manage notification recipients.');

    const { data, error } = await supabase
      .from('notification_recipients')
      .update(payload)
      .eq('id', params.recipientId)
      .eq('team_id', params.teamId)
      .select('id, team_id, email, events, enabled, created_at')
      .single();

    if (error) throw error;
    return ok({ recipient: data });
  } catch (error) {
    if (error instanceof z.ZodError) return badRequest('Invalid notification recipient payload.', error.flatten());
    return serverError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { teamId: string; recipientId: string } }
) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) return unauthorized();
    const supabase = createSupabaseAdminClient();
    const permission = await requireTeamRole(supabase, params.teamId, auth.user.id, ['owner', 'admin']);
    if (!permission.allowed) return forbidden('Only team owners and admins can manage notification recipients.');

    const { error } = await supabase
      .from('notification_recipients')
      .delete()
      .eq('id', params.recipientId)
      .eq('team_id', params.teamId);

    if (error) throw error;
    return ok({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
