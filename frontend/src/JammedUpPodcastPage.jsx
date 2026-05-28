import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  PODCAST_UPDATED_EVENT,
  defaultPodcastShow,
  normalizePodcastLibrary,
  publishPodcastLibrary,
  readStoredPodcastLibrary,
  visiblePodcastEpisodes
} from './podcast-data.js';
import RTBIPadVideoPlayer from './RTBIPadVideoPlayer.jsx';
import './jammed-up-podcast.css';

const API_URL = import.meta.env.VITE_RTBO_API_URL || '/api';

async function apiGet(endpoint) {
  const response = await fetch(`${API_URL}${endpoint}`, { credentials: 'include' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Request failed.');
  }
  return data;
}

function PodcastChromePlayer({ show, episodes, selectedId, onSelect }) {
  const playlist = episodes.map(episode => ({
    id: episode.id,
    title: episode.title,
    poster: episode.posterUrl || show.logoCard || defaultPodcastShow.logoCard,
    sources: episode.videoUrl ? [{ src: episode.videoUrl }] : [],
    transcript: episode.transcript || ''
  }));
  const hasPublishedVideo = playlist.some(item => item.sources.length);

  return (
    <section className="jammed-player-section" aria-labelledby="jammed-player-title">
      <h2 id="jammed-player-title" className="sr-only">{show.name} video player</h2>
      <RTBIPadVideoPlayer
        className="jammed-ipad-player"
        brand={show.name}
        logoSrc={show.logoMark || defaultPodcastShow.logoMark}
        status={hasPublishedVideo ? 'Ready' : 'Awaiting Video'}
        playlist={playlist}
        selectedId={selectedId}
        onSelect={onSelect}
        emptyTitle="No published podcast videos yet"
        emptyMessage="Real podcast videos will appear here after they are added and published in the Podcast Builder."
        settingsNote="The podcast player only loads published episodes with real video URLs from the Podcast Builder."
      />
    </section>
  );
}

export default function JammedUpPodcastPage() {
  const [library, setLibrary] = useState(readStoredPodcastLibrary);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    let active = true;
    apiGet('/podcast.php')
      .then(data => {
        if (!active) return;
        const nextLibrary = publishPodcastLibrary({ show: data.show, episodes: data.episodes, updatedAt: data.updated_at });
        setLibrary(nextLibrary);
        const visibleEpisodes = visiblePodcastEpisodes(nextLibrary.episodes);
        setSelectedId(current => current || visibleEpisodes[0]?.id || '');
      })
      .catch(() => {
        if (!active) return;
        const stored = readStoredPodcastLibrary();
        setLibrary(stored);
        const visibleEpisodes = visiblePodcastEpisodes(stored.episodes);
        setSelectedId(current => current || visibleEpisodes[0]?.id || '');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    function syncPodcast(event) {
      const nextLibrary = normalizePodcastLibrary(event?.detail?.library || readStoredPodcastLibrary());
      setLibrary(nextLibrary);
      const visibleEpisodes = visiblePodcastEpisodes(nextLibrary.episodes);
      setSelectedId(current => visibleEpisodes.some(episode => episode.id === current) ? current : (visibleEpisodes[0]?.id || ''));
    }

    window.addEventListener(PODCAST_UPDATED_EVENT, syncPodcast);
    return () => {
      active = false;
      window.removeEventListener(PODCAST_UPDATED_EVENT, syncPodcast);
    };
  }, []);

  const show = library.show || defaultPodcastShow;
  const episodes = useMemo(() => visiblePodcastEpisodes(library.episodes), [library.episodes]);
  const selectedEpisode = episodes.find(episode => episode.id === selectedId) || episodes[0] || null;

  return (
    <section className="jammed-podcast-page" aria-labelledby="jammed-podcast-title">
      <div className="jammed-podcast-wrap">
        <section className="jammed-podcast-hero">
          <div className="jammed-podcast-copy">
            <p className="eyebrow">{show.brandLine}</p>
            <h2 id="jammed-podcast-title">{show.name}</h2>
            <p>{show.mission}</p>
            <div className="jammed-podcast-facts">
              <article><span>Tagline</span><strong>{show.tagline}</strong></article>
              <article><span>Audience</span><strong>{show.audience}</strong></article>
              <article><span>Release Plan</span><strong>{show.releaseSchedule}</strong></article>
            </div>
          </div>
          <div className="jammed-podcast-logo-stage">
            <picture>
              <source srcSet={show.logoCard || defaultPodcastShow.logoCard} type="image/webp" />
              <img src={show.logo || defaultPodcastShow.logo} alt={`${show.name} logo`} />
            </picture>
          </div>
        </section>

        <PodcastChromePlayer show={show} episodes={episodes} selectedId={selectedEpisode?.id || ''} onSelect={setSelectedId} />

        <section className="jammed-podcast-library" aria-labelledby="jammed-library-title">
          <div className="jammed-section-head">
            <p className="eyebrow">Video Library</p>
            <h2 id="jammed-library-title">Published podcast videos</h2>
            <p>{loading ? 'Loading published podcast videos...' : 'Only real published podcast videos from the Podcast Builder appear here.'}</p>
          </div>

          {episodes.length === 0 ? (
            <div className="jammed-empty-library">
              <h3>No published podcast videos are available yet.</h3>
              <p>The library will populate automatically after real video sources are added and published.</p>
            </div>
          ) : (
            <div className="jammed-episode-grid">
              {episodes.map(episode => (
                <article className={selectedEpisode?.id === episode.id ? 'active' : ''} key={episode.id}>
                  <button type="button" onClick={() => setSelectedId(episode.id)}>
                    <img src={episode.posterUrl || show.logoCard || defaultPodcastShow.logoCard} alt="" />
                    <span>{episode.category || 'Podcast Video'}</span>
                    <strong>{episode.title}</strong>
                    {episode.subtitle && <small>{episode.subtitle}</small>}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="jammed-brand-meaning">
          <p className="eyebrow">Brand Meaning</p>
          <h2>Do not stay jammed up.</h2>
          <p>{show.brandMeaning}</p>
        </section>
      </div>
    </section>
  );
}
