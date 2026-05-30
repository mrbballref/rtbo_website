export function requireEnv(name: string) {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function optionalEnv(name: string) {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

export function getSiteUrl() {
  return optionalEnv('NEXT_PUBLIC_SITE_URL') ?? 'http://localhost:3000';
}

export function getFilmBucket() {
  return optionalEnv('SUPABASE_FILM_BUCKET') ?? 'game-films';
}
