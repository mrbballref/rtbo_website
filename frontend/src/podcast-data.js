export const PODCAST_LIBRARY_KEY = 'rtbo-jammed-up-podcast-library';
export const PODCAST_UPDATED_EVENT = 'rtbo-jammed-up-podcast-updated';

export const defaultPodcastShow = {
  name: 'The Jammed Up Bar! Podcast',
  shortName: 'Jammed Up',
  tagline: "We Don't Just Make This Up.",
  brandLine: 'A Raising The Bar Officiating sister platform',
  mission: 'A dynamic podcast and media platform spotlighting basketball officials who stay calm under pressure, fight out of tough corners, and keep raising the bar.',
  brandMeaning: 'Jammed Up means not letting yourself get backed into a corner. You stay calm under pressure, fight your way out, and keep moving forward.',
  audience: 'Basketball officials first, with basketball fans growing into an equal audience over time.',
  releaseSchedule: 'Saturday and Sunday at 5 PM Central until viewership increases.',
  logo: '/assets/podcast/jammed-up-bar-logo-transparent.png',
  logoCard: '/assets/podcast/jammed-up-bar-logo-card.webp',
  logoMark: '/assets/podcast/jammed-up-bar-logo-mark.png',
  socialCard: '/assets/podcast/social-card.png'
};

export const emptyPodcastLibrary = {
  show: defaultPodcastShow,
  episodes: [],
  updatedAt: ''
};

function textValue(value = '', fallback = '') {
  return String(value ?? fallback).trim();
}

export function podcastSlug(value = 'podcast-episode') {
  return String(value || 'podcast-episode')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'podcast-episode';
}

function normalizeStatus(value = 'draft') {
  const status = podcastSlug(value, 'draft');
  if (['published', 'active'].includes(status)) return 'published';
  if (['hidden', 'archived'].includes(status)) return 'hidden';
  return 'draft';
}

function normalizeNumber(value, fallback = '') {
  if (value === '' || value === null || value === undefined) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : fallback;
}

export function normalizePodcastShow(show = {}) {
  return {
    name: textValue(show.name, defaultPodcastShow.name),
    shortName: textValue(show.shortName, defaultPodcastShow.shortName),
    tagline: textValue(show.tagline, defaultPodcastShow.tagline),
    brandLine: textValue(show.brandLine, defaultPodcastShow.brandLine),
    mission: textValue(show.mission, defaultPodcastShow.mission),
    brandMeaning: textValue(show.brandMeaning, defaultPodcastShow.brandMeaning),
    audience: textValue(show.audience, defaultPodcastShow.audience),
    releaseSchedule: textValue(show.releaseSchedule, defaultPodcastShow.releaseSchedule),
    logo: textValue(show.logo, defaultPodcastShow.logo),
    logoCard: textValue(show.logoCard, defaultPodcastShow.logoCard),
    logoMark: textValue(show.logoMark, defaultPodcastShow.logoMark),
    socialCard: textValue(show.socialCard, defaultPodcastShow.socialCard)
  };
}

export function normalizePodcastEpisode(episode = {}, index = 0) {
  const title = textValue(episode.title);
  const id = podcastSlug(episode.id || episode.slug || title || `episode-${index + 1}`);
  const videoUrl = textValue(episode.videoUrl || episode.video_url);
  const posterUrl = textValue(episode.posterUrl || episode.poster_url);
  const publishedAt = textValue(episode.publishedAt || episode.published_at || episode.date);

  return {
    id,
    slug: podcastSlug(episode.slug || id),
    title,
    subtitle: textValue(episode.subtitle),
    description: textValue(episode.description || episode.summary),
    status: normalizeStatus(episode.status),
    season: normalizeNumber(episode.season, ''),
    episode: normalizeNumber(episode.episode, ''),
    publishedAt,
    runtime: textValue(episode.runtime),
    category: textValue(episode.category || episode.level),
    guests: textValue(episode.guests || episode.guest),
    videoUrl,
    posterUrl,
    transcript: textValue(episode.transcript),
    updatedAt: textValue(episode.updatedAt || episode.updated_at)
  };
}

export function normalizePodcastEpisodes(episodes = []) {
  const seen = new Set();
  return (Array.isArray(episodes) ? episodes : [])
    .map((episode, index) => normalizePodcastEpisode(episode, index))
    .filter((episode) => {
      if (!episode.id || !episode.title || seen.has(episode.id)) return false;
      seen.add(episode.id);
      return true;
    });
}

export function normalizePodcastLibrary(library = {}) {
  return {
    show: normalizePodcastShow(library.show || library.site || {}),
    episodes: normalizePodcastEpisodes(library.episodes || []),
    updatedAt: textValue(library.updatedAt || library.updated_at)
  };
}

export function visiblePodcastEpisodes(episodes = []) {
  return normalizePodcastEpisodes(episodes).filter(episode => episode.status === 'published' && episode.videoUrl);
}

export function readStoredPodcastLibrary() {
  try {
    return normalizePodcastLibrary(JSON.parse(localStorage.getItem(PODCAST_LIBRARY_KEY) || '{}'));
  } catch {
    return normalizePodcastLibrary(emptyPodcastLibrary);
  }
}

export function publishPodcastLibrary(library) {
  const normalized = normalizePodcastLibrary(library);
  try {
    localStorage.setItem(PODCAST_LIBRARY_KEY, JSON.stringify(normalized));
  } catch {
    // Server data and defaults still allow the page to render.
  }
  window.dispatchEvent(new CustomEvent(PODCAST_UPDATED_EVENT, { detail: { library: normalized } }));
  return normalized;
}
