import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/db-types';
import type { FilmAsset, GameFilm } from '@/types/locker-room';
import { languageName } from '@/lib/constants/languages';

export const FILM_SELECT = `
  id,
  team_id,
  title,
  opponent,
  game_date,
  venue,
  competition_level,
  status,
  download_enabled,
  original_filename,
  mime_type,
  size_bytes,
  duration_seconds,
  view_count,
  download_count,
  uploaded_by,
  created_at,
  updated_at,
  last_viewed_at,
  film_assets (
    id,
    film_id,
    kind,
    status,
    quality_label,
    language_code,
    original_filename,
    mime_type,
    size_bytes,
    created_at
  )
`;

type FilmRow = Database['public']['Tables']['game_films']['Row'] & { film_assets?: FilmAsset[] | null };

export function toGameFilm(row: FilmRow): GameFilm {
  return {
    id: row.id,
    team_id: row.team_id,
    title: row.title,
    opponent: row.opponent,
    game_date: row.game_date,
    venue: row.venue,
    competition_level: row.competition_level,
    status: row.status,
    download_enabled: row.download_enabled,
    original_filename: row.original_filename,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    duration_seconds: row.duration_seconds ? Number(row.duration_seconds) : null,
    view_count: Number(row.view_count ?? 0),
    download_count: Number(row.download_count ?? 0),
    uploaded_by: row.uploaded_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_viewed_at: row.last_viewed_at,
    assets: (row.film_assets ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at))
  };
}

export async function fetchFilmDto(supabase: SupabaseClient<Database>, filmId: string) {
  const { data, error } = await supabase.from('game_films').select(FILM_SELECT).eq('id', filmId).maybeSingle();
  if (error) throw error;
  return data ? toGameFilm(data as FilmRow) : null;
}

export function subtitleLabel(languageCode: string | null | undefined) {
  return languageName(languageCode);
}
