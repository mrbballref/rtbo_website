-- The Locker Room production schema for Supabase.
-- Run this in the Supabase SQL editor before starting the app.
-- No demo rows or fake game films are inserted by this script.

create extension if not exists pgcrypto;

begin;

do $$ begin
  create type public.team_role as enum ('owner', 'admin', 'uploader', 'viewer');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.film_status as enum ('uploading', 'ready', 'archived', 'failed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.film_event_type as enum ('upload', 'view', 'download', 'recording');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.film_asset_kind as enum ('video', 'subtitle', 'thumbnail');
exception when duplicate_object then null;
end $$;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) >= 2),
  slug text not null unique,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.team_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table if not exists public.game_films (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null check (char_length(trim(title)) >= 2),
  opponent text,
  game_date date,
  venue text,
  competition_level text,
  storage_bucket text not null default 'game-films',
  storage_path text not null,
  status public.film_status not null default 'uploading',
  download_enabled boolean not null default true,
  original_filename text not null,
  mime_type text,
  size_bytes bigint,
  duration_seconds numeric,
  view_count bigint not null default 0,
  download_count bigint not null default 0,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_viewed_at timestamptz,
  unique (storage_bucket, storage_path)
);

create table if not exists public.film_assets (
  id uuid primary key default gen_random_uuid(),
  film_id uuid not null references public.game_films(id) on delete cascade,
  kind public.film_asset_kind not null,
  status public.film_status not null default 'uploading',
  storage_bucket text not null default 'game-films',
  storage_path text not null,
  quality_label text,
  language_code text,
  original_filename text,
  mime_type text,
  size_bytes bigint,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, storage_path),
  constraint film_assets_quality_check check (
    quality_label is null or quality_label in ('240p', '360p', '480p', '720p60', '1080p60', '1440p60')
  ),
  constraint film_assets_subtitle_language_check check (
    kind <> 'subtitle' or language_code is not null
  )
);

create table if not exists public.film_events (
  id uuid primary key default gen_random_uuid(),
  film_id uuid not null references public.game_films(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type public.film_event_type not null,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_recipients (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  email text not null,
  events public.film_event_type[] not null default array['upload','view','download']::public.film_event_type[],
  enabled boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_team_members_user on public.team_members(user_id);
create index if not exists idx_game_films_team_status on public.game_films(team_id, status, created_at desc);
create index if not exists idx_film_assets_film on public.film_assets(film_id, kind, status);
create index if not exists idx_film_events_film_type_created on public.film_events(film_id, event_type, created_at desc);
create index if not exists idx_notification_recipients_team on public.notification_recipients(team_id, enabled);
create unique index if not exists idx_notification_recipients_team_email on public.notification_recipients(team_id, lower(email));

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_user_profiles_updated_at on public.user_profiles;
create trigger touch_user_profiles_updated_at before update on public.user_profiles
for each row execute function public.touch_updated_at();

drop trigger if exists touch_teams_updated_at on public.teams;
create trigger touch_teams_updated_at before update on public.teams
for each row execute function public.touch_updated_at();

drop trigger if exists touch_game_films_updated_at on public.game_films;
create trigger touch_game_films_updated_at before update on public.game_films
for each row execute function public.touch_updated_at();

drop trigger if exists touch_film_assets_updated_at on public.film_assets;
create trigger touch_film_assets_updated_at before update on public.film_assets
for each row execute function public.touch_updated_at();

drop trigger if exists touch_notification_recipients_updated_at on public.notification_recipients;
create trigger touch_notification_recipients_updated_at before update on public.notification_recipients
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.user_profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.user_profiles.avatar_url);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_members tm
    where tm.team_id = p_team_id and tm.user_id = auth.uid()
  );
$$;

create or replace function public.has_team_role(p_team_id uuid, p_roles public.team_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
      and tm.role = any(p_roles)
  );
$$;

alter table public.user_profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.game_films enable row level security;
alter table public.film_assets enable row level security;
alter table public.film_events enable row level security;
alter table public.notification_recipients enable row level security;

drop policy if exists user_profiles_select_own on public.user_profiles;
create policy user_profiles_select_own on public.user_profiles
for select to authenticated using (id = auth.uid());

drop policy if exists user_profiles_update_own on public.user_profiles;
create policy user_profiles_update_own on public.user_profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists teams_select_member on public.teams;
create policy teams_select_member on public.teams
for select to authenticated using (public.is_team_member(id));

drop policy if exists teams_insert_authenticated on public.teams;
create policy teams_insert_authenticated on public.teams
for insert to authenticated with check (created_by = auth.uid());

drop policy if exists teams_update_admin on public.teams;
create policy teams_update_admin on public.teams
for update to authenticated using (public.has_team_role(id, array['owner','admin']::public.team_role[]));

drop policy if exists team_members_select_self_or_admin on public.team_members;
create policy team_members_select_self_or_admin on public.team_members
for select to authenticated using (
  user_id = auth.uid() or public.has_team_role(team_id, array['owner','admin']::public.team_role[])
);

drop policy if exists team_members_insert_admin on public.team_members;
create policy team_members_insert_admin on public.team_members
for insert to authenticated with check (
  public.has_team_role(team_id, array['owner','admin']::public.team_role[])
);

drop policy if exists team_members_update_owner_admin on public.team_members;
create policy team_members_update_owner_admin on public.team_members
for update to authenticated using (
  public.has_team_role(team_id, array['owner','admin']::public.team_role[])
);

drop policy if exists game_films_select_member on public.game_films;
create policy game_films_select_member on public.game_films
for select to authenticated using (public.is_team_member(team_id));

drop policy if exists game_films_insert_uploader on public.game_films;
create policy game_films_insert_uploader on public.game_films
for insert to authenticated with check (
  uploaded_by = auth.uid() and public.has_team_role(team_id, array['owner','admin','uploader']::public.team_role[])
);

drop policy if exists game_films_update_uploader on public.game_films;
create policy game_films_update_uploader on public.game_films
for update to authenticated using (
  public.has_team_role(team_id, array['owner','admin','uploader']::public.team_role[])
);

drop policy if exists film_assets_select_member on public.film_assets;
create policy film_assets_select_member on public.film_assets
for select to authenticated using (
  exists (
    select 1 from public.game_films gf
    where gf.id = film_assets.film_id and public.is_team_member(gf.team_id)
  )
);

drop policy if exists film_assets_insert_uploader on public.film_assets;
create policy film_assets_insert_uploader on public.film_assets
for insert to authenticated with check (
  created_by = auth.uid() and exists (
    select 1 from public.game_films gf
    where gf.id = film_assets.film_id
      and public.has_team_role(gf.team_id, array['owner','admin','uploader']::public.team_role[])
  )
);

drop policy if exists film_assets_update_uploader on public.film_assets;
create policy film_assets_update_uploader on public.film_assets
for update to authenticated using (
  exists (
    select 1 from public.game_films gf
    where gf.id = film_assets.film_id
      and public.has_team_role(gf.team_id, array['owner','admin','uploader']::public.team_role[])
  )
);

drop policy if exists film_events_select_admin on public.film_events;
create policy film_events_select_admin on public.film_events
for select to authenticated using (
  exists (
    select 1 from public.game_films gf
    where gf.id = film_events.film_id
      and public.has_team_role(gf.team_id, array['owner','admin']::public.team_role[])
  )
);

drop policy if exists film_events_insert_member on public.film_events;
create policy film_events_insert_member on public.film_events
for insert to authenticated with check (
  actor_id = auth.uid() and exists (
    select 1 from public.game_films gf
    where gf.id = film_events.film_id and public.is_team_member(gf.team_id)
  )
);

drop policy if exists notification_recipients_select_admin on public.notification_recipients;
create policy notification_recipients_select_admin on public.notification_recipients
for select to authenticated using (public.has_team_role(team_id, array['owner','admin']::public.team_role[]));

drop policy if exists notification_recipients_insert_admin on public.notification_recipients;
create policy notification_recipients_insert_admin on public.notification_recipients
for insert to authenticated with check (
  created_by = auth.uid() and public.has_team_role(team_id, array['owner','admin']::public.team_role[])
);

drop policy if exists notification_recipients_update_admin on public.notification_recipients;
create policy notification_recipients_update_admin on public.notification_recipients
for update to authenticated using (public.has_team_role(team_id, array['owner','admin']::public.team_role[]));

drop policy if exists notification_recipients_delete_admin on public.notification_recipients;
create policy notification_recipients_delete_admin on public.notification_recipients
for delete to authenticated using (public.has_team_role(team_id, array['owner','admin']::public.team_role[]));


create or replace function public.increment_film_view(p_film_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.game_films
  set view_count = view_count + 1,
      last_viewed_at = now(),
      updated_at = now()
  where id = p_film_id;
$$;

create or replace function public.increment_film_download(p_film_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.game_films
  set download_count = download_count + 1,
      updated_at = now()
  where id = p_film_id;
$$;

revoke execute on function public.increment_film_view(uuid) from public, anon, authenticated;
revoke execute on function public.increment_film_download(uuid) from public, anon, authenticated;
grant execute on function public.increment_film_view(uuid) to service_role;
grant execute on function public.increment_film_download(uuid) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'game-films',
  'game-films',
  false,
  null,
  array[
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-m4v',
    'application/x-mpegURL',
    'text/vtt',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)
on conflict (id) do update set
  public = excluded.public,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
