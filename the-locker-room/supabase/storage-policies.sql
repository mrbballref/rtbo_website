-- The Locker Room keeps the game-films bucket private.
-- Signed upload URLs and signed playback/download URLs are created by server routes with the service-role key.
-- This avoids public film exposure and ensures every view/download can be logged and emailed.

-- Optional hard-deny direct object listing to authenticated clients.
-- Supabase service-role operations bypass RLS; browser users should use the app API routes.

drop policy if exists game_films_no_direct_select on storage.objects;
create policy game_films_no_direct_select on storage.objects
for select to authenticated
using (bucket_id <> 'game-films');
