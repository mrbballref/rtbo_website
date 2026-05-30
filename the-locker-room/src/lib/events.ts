import type { SupabaseClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import type { Database, Json } from '@/lib/db-types';
import type { FilmEventType } from '@/types/locker-room';

export function requestIp(request: NextRequest) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  );
}

export async function logFilmEvent(
  supabase: SupabaseClient<Database>,
  request: NextRequest,
  params: {
    filmId: string;
    actorId: string | null;
    eventType: FilmEventType;
    metadata?: Json | null;
  }
) {
  const { error } = await supabase.from('film_events').insert({
    film_id: params.filmId,
    actor_id: params.actorId,
    event_type: params.eventType,
    ip_address: requestIp(request),
    user_agent: request.headers.get('user-agent'),
    metadata: params.metadata ?? null
  });

  if (error) throw error;
}
