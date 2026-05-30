# The Locker Room

A production-grade, standalone basketball game-film app for Raising The Bar Officiating. The app includes a Synergy Express / DVSport-inspired film sidebar, secure upload/download workflows, a realistic iPad-style video player, audit logging, email notifications, WebVTT captions, quality-variant asset management, PWA support, and Capacitor hooks for iOS and Android.

This codebase does **not** seed fake game film, fake files, or sample video. The player only renders real film uploaded into your private Supabase Storage bucket.

## What is included

- Next.js App Router application with TypeScript.
- Supabase Auth, private Storage, Postgres schema, RLS policies, teams, roles, film metadata, film assets, events, and notification recipients.
- Secure signed upload URLs for large film files.
- Secure signed playback and download URLs so every view/download can be logged.
- Email notifications on upload, view, and download through SMTP/Nodemailer.
- Real iPad-style film player with AutoPlay, Play, Pause, Stop, Rew, FFwd, Next, Prev, timeline, volume, Rec, settings fly-out, captions, theater mode, full screen, PiP, quality selection, and positive/reverse speed controls.
- Chrome-effect controls with active green Play, scarlet Rec, and gold Rew/FFwd states.
- WebVTT caption upload and language selection.
- Quality-variant upload support for 240p, 360p, 480p, 720p60, 1080p60, and 1440p60. Quality options are disabled until a real asset has been uploaded.
- Responsive layouts across phone, tablet, laptop, and desktop breakpoints.
- SEO metadata, Open Graph metadata, JSON-LD, robots, sitemap, and manifest.
- PWA service worker and installable standalone mode.
- Capacitor config for iOS and Android packaging.

## 1. Create the Supabase backend

1. Create a Supabase project.
2. Open the SQL editor.
3. Run `supabase/schema.sql`.
4. Keep the `game-films` bucket private.
5. Do not add sample rows unless you intentionally want test content. The app is built to work with real uploads only.

The schema creates:

- `user_profiles`
- `teams`
- `team_members`
- `game_films`
- `film_assets`
- `film_events`
- `notification_recipients`
- a private `game-films` storage bucket
- RLS policies and helper functions

## 2. Configure environment variables

Create `.env.local` and fill in real values. Environment templates are intentionally not tracked in the main RTBO repository because the production audit blocks env files from commits.

Required values:

```bash
NEXT_PUBLIC_SITE_URL=https://your-production-domain.example
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-real-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-real-service-role-key
SUPABASE_FILM_BUCKET=game-films
```

Email notifications require SMTP:

```bash
SMTP_HOST=smtp.your-provider.example
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-real-smtp-user
SMTP_PASSWORD=your-real-smtp-password
SMTP_FROM="The Locker Room <film@your-domain.example>"
ADMIN_NOTIFICATION_EMAILS=admin@your-domain.example,filmroom@your-domain.example
```

Team owners/admins can also add recipients inside the app. `ADMIN_NOTIFICATION_EMAILS` is a fallback global recipient list.

## 3. Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Create an account through Supabase Auth, create a team room, then upload real game film. The sidebar will remain empty until real film is uploaded.

## 4. Production build

```bash
npm run build
npm run start
```

Docker is included:

```bash
docker compose up --build
```

## 5. iOS and Android apps

This project is configured for Capacitor. The mobile apps use the deployed Locker Room web app as the native shell so the same secure API routes, signed URLs, and Supabase backend stay authoritative.

1. Deploy the Next.js app to your production domain.
2. Set `CAPACITOR_SERVER_URL` in `.env.local` to that production URL.
3. Add native platforms:

```bash
npm run native:add:ios
npm run native:add:android
npm run native:sync
```

4. Open and build the native projects:

```bash
npm run native:ios
npm run native:android
```

Use Xcode for iOS signing and Android Studio for Android signing.

## 6. Upload, view, download, and email flow

### Upload

1. A team owner/admin/uploader enters metadata and chooses a real video file.
2. The server creates a film row and signed Supabase Storage upload URL.
3. The browser uploads the file directly to private storage.
4. The browser calls the completion endpoint.
5. The app marks the film ready, writes a `film_events` row, and sends upload notifications.

### View

1. Selecting a film requests a short-lived signed playback URL.
2. The API verifies team membership.
3. The API logs a `view` event, increments `view_count`, signs caption assets, and emails recipients.
4. The player renders the signed film URL.

### Download

1. Download requests go through the API.
2. The API verifies access and `download_enabled`.
3. The API logs a `download` event, increments `download_count`, emails recipients, and returns a short-lived signed download URL.

## 7. Roles

- `owner`: full team control, notification management, uploads, views, downloads.
- `admin`: team administration, notification management, uploads, views, downloads.
- `uploader`: upload and manage film assets, views, downloads.
- `viewer`: view/download allowed film only.

The initial team creator becomes `owner`.

## 8. Captions and quality variants

The player lists all requested language options and all requested quality options. It does not fake availability. Captions and quality variants become selectable only after a real corresponding file has been uploaded through the asset manager.

## 9. Recording

The Rec button uses the browser MediaRecorder API against the current video element when supported. Browser support depends on the platform, codec, and signed media stream behavior. Successful recordings are downloaded locally and logged as `recording` events.

## 10. Security notes

- The Storage bucket is private.
- Public direct film URLs are not used.
- Service-role keys are used only in server routes.
- Browser code uses the anon key and the user session.
- Every signed playback and download request checks team membership.
- RLS policies are included.

## 11. Brand asset

The RTBO logo is included under `public/brand/rtbo_logo_.webp` for the Raising The Bar Officiating app UI. Replace it only if the organization provides a newer official mark.
