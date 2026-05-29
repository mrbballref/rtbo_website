export const CLIENT_SPOTLIGHT_LIBRARY_KEY = 'rtbo-client-spotlight-library';
export const CLIENT_SPOTLIGHT_UPDATED_EVENT = 'rtbo-client-spotlight-updated';

export const defaultClientSpotlightShow = {
  name: 'Client Spotlight',
  shortName: 'RTBO Spotlight',
  tagline: 'Real conversations from the RTBO training schools and events.',
  brandLine: 'Raising The Bar Officiating',
  mission: 'A production library for coach conversations, player interviews, official development stories, school highlights, and promotional films connected to Raising The Bar Officiating.',
  logo: '/assets/images/logo.png',
  logoCard: '/assets/images/3d_rtbo_livestream_icon.jpg',
  logoMark: '/assets/images/logo.png'
};

export const emptyClientSpotlightLibrary = {
  show: defaultClientSpotlightShow,
  videos: [],
  updatedAt: ''
};

function textValue(value = '', fallback = '') {
  return String(value ?? fallback).trim();
}

export function clientSpotlightSlug(value = 'client-spotlight-video') {
  return String(value || 'client-spotlight-video')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'client-spotlight-video';
}

function normalizeStatus(value = 'draft') {
  const status = clientSpotlightSlug(value);
  if (['published', 'active'].includes(status)) return 'published';
  if (['hidden', 'archived'].includes(status)) return 'hidden';
  return 'draft';
}

export function normalizeClientSpotlightShow(show = {}) {
  return {
    name: textValue(show.name, defaultClientSpotlightShow.name),
    shortName: textValue(show.shortName, defaultClientSpotlightShow.shortName),
    tagline: textValue(show.tagline, defaultClientSpotlightShow.tagline),
    brandLine: textValue(show.brandLine, defaultClientSpotlightShow.brandLine),
    mission: textValue(show.mission, defaultClientSpotlightShow.mission),
    logo: textValue(show.logo, defaultClientSpotlightShow.logo),
    logoCard: textValue(show.logoCard, defaultClientSpotlightShow.logoCard),
    logoMark: textValue(show.logoMark, defaultClientSpotlightShow.logoMark)
  };
}

export function normalizeClientSpotlightVideo(video = {}, index = 0) {
  const title = textValue(video.title);
  const id = clientSpotlightSlug(video.id || video.slug || title || `spotlight-video-${index + 1}`);
  const videoUrl = textValue(video.videoUrl || video.video_url);
  const posterUrl = textValue(video.posterUrl || video.poster_url);
  const publishedAt = textValue(video.publishedAt || video.published_at || video.date);

  return {
    id,
    slug: clientSpotlightSlug(video.slug || id),
    title,
    subtitle: textValue(video.subtitle),
    description: textValue(video.description || video.summary),
    status: normalizeStatus(video.status),
    category: textValue(video.category || 'Training School Conversation'),
    featuredPerson: textValue(video.featuredPerson || video.featured_person || video.person),
    role: textValue(video.role),
    affiliation: textValue(video.affiliation || video.organization),
    eventName: textValue(video.eventName || video.event_name),
    eventDate: textValue(video.eventDate || video.event_date),
    publishedAt,
    runtime: textValue(video.runtime),
    videoUrl,
    posterUrl,
    transcript: textValue(video.transcript),
    updatedAt: textValue(video.updatedAt || video.updated_at)
  };
}

export function normalizeClientSpotlightVideos(videos = []) {
  const seen = new Set();
  return (Array.isArray(videos) ? videos : [])
    .map((video, index) => normalizeClientSpotlightVideo(video, index))
    .filter((video) => {
      if (!video.id || !video.title || seen.has(video.id)) return false;
      seen.add(video.id);
      return true;
    });
}

export function normalizeClientSpotlightLibrary(library = {}) {
  return {
    show: normalizeClientSpotlightShow(library.show || library.site || {}),
    videos: normalizeClientSpotlightVideos(library.videos || library.episodes || []),
    updatedAt: textValue(library.updatedAt || library.updated_at)
  };
}

export function visibleClientSpotlightVideos(videos = []) {
  return normalizeClientSpotlightVideos(videos).filter(video => video.status === 'published' && video.videoUrl);
}

export function readStoredClientSpotlightLibrary() {
  if (typeof localStorage === 'undefined') return normalizeClientSpotlightLibrary(emptyClientSpotlightLibrary);
  try {
    return normalizeClientSpotlightLibrary(JSON.parse(localStorage.getItem(CLIENT_SPOTLIGHT_LIBRARY_KEY) || '{}'));
  } catch {
    return normalizeClientSpotlightLibrary(emptyClientSpotlightLibrary);
  }
}

export function publishClientSpotlightLibrary(library) {
  const normalized = normalizeClientSpotlightLibrary(library);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(CLIENT_SPOTLIGHT_LIBRARY_KEY, JSON.stringify(normalized));
    } catch {
      // Server data and defaults still allow the public player to render.
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CLIENT_SPOTLIGHT_UPDATED_EVENT, { detail: { library: normalized } }));
  }
  return normalized;
}
