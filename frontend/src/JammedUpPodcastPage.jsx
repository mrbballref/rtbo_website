import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  PODCAST_UPDATED_EVENT,
  defaultPodcastShow,
  normalizePodcastLibrary,
  publishPodcastLibrary,
  readStoredPodcastLibrary,
  visiblePodcastEpisodes
} from './podcast-data.js';
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

function formatTime(seconds = 0) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const mins = Math.floor(safeSeconds / 60);
  const secs = String(safeSeconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

function PodcastChromePlayer({ show, episodes, selectedId, onSelect }) {
  const videoRef = useRef(null);
  const frameRef = useRef(null);
  const selectedEpisode = episodes.find(episode => episode.id === selectedId) || episodes[0] || null;
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [volume, setVolume] = useState(0.78);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [captions, setCaptions] = useState(false);
  const [theater, setTheater] = useState(false);

  const hasVideo = Boolean(selectedEpisode?.videoUrl);
  const progress = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = muted ? 0 : volume;
    video.muted = muted;
    video.playbackRate = speed;
  }, [muted, speed, volume, selectedEpisode?.id]);

  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
  }, [selectedEpisode?.id]);

  async function play() {
    const video = videoRef.current;
    if (!video) return;
    try {
      await video.play();
    } catch {
      setPlaying(false);
    }
  }

  function pause() {
    videoRef.current?.pause();
  }

  function stop() {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    setCurrent(0);
    setPlaying(false);
  }

  function seekTo(percent) {
    const video = videoRef.current;
    if (!video || duration <= 0) return;
    video.currentTime = (Math.max(0, Math.min(100, percent)) / 100) * duration;
  }

  function skip(seconds) {
    const video = videoRef.current;
    if (!video || duration <= 0) return;
    video.currentTime = Math.max(0, Math.min(duration, (video.currentTime || 0) + seconds));
  }

  function cycleSpeed() {
    setSpeed(currentSpeed => {
      const speeds = [1, 1.25, 1.5, 2, 0.75];
      return speeds[(speeds.indexOf(currentSpeed) + 1) % speeds.length] || 1;
    });
  }

  function toggleFullscreen() {
    const frame = frameRef.current;
    if (!frame) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }
    frame.requestFullscreen?.();
  }

  function selectAdjacent(direction) {
    if (!episodes.length) return;
    const currentIndex = Math.max(0, episodes.findIndex(episode => episode.id === selectedEpisode?.id));
    const nextIndex = Math.max(0, Math.min(episodes.length - 1, currentIndex + direction));
    onSelect(episodes[nextIndex].id);
  }

  return (
    <section className={`jammed-player-section ${theater ? 'is-theater' : ''}`} aria-labelledby="jammed-player-title">
      <div className="jammed-player-frame" ref={frameRef}>
        <header className="jammed-player-topbar">
          <div className="jammed-player-brand">
            <img src={show.logoMark || defaultPodcastShow.logoMark} alt="" />
            <div>
              <strong id="jammed-player-title">{show.name}</strong>
              <span>{selectedEpisode ? selectedEpisode.title : 'No published podcast video selected'}</span>
            </div>
          </div>
          <div className="jammed-player-status">
            <span>{hasVideo ? 'Ready' : 'Awaiting Video'}</span>
            <b>{show.tagline}</b>
          </div>
        </header>

        <div className="jammed-player-screen">
          {hasVideo ? (
            <video
              ref={videoRef}
              src={selectedEpisode.videoUrl}
              poster={selectedEpisode.posterUrl || show.logoCard || defaultPodcastShow.logoCard}
              playsInline
              preload="metadata"
              onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
              onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime || 0)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
            >
            </video>
          ) : (
            <div className="jammed-player-empty">
              <img src={show.logoCard || defaultPodcastShow.logoCard} alt="" />
              <h3>No published podcast videos yet</h3>
              <p>Real podcast videos will appear here after they are added and published in the Podcast Builder.</p>
            </div>
          )}
          {hasVideo && !playing && (
            <button className="jammed-player-center-play" type="button" onClick={play} aria-label="Play podcast video">
              Play
            </button>
          )}
          {hasVideo && captions && selectedEpisode?.transcript && (
            <div className="jammed-caption-strip" aria-live="polite">{selectedEpisode.transcript}</div>
          )}
        </div>

        <div className="jammed-player-controls" aria-label="Podcast video controls">
          <div className="jammed-progress-row">
            <span>{formatTime(current)}</span>
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(event) => seekTo(Number(event.target.value))}
              disabled={!hasVideo || duration <= 0}
              aria-label="Seek podcast video"
            />
            <span>{formatTime(duration)}</span>
          </div>
          <div className="jammed-control-row">
            <button type="button" onClick={() => selectAdjacent(-1)} disabled={!hasVideo || episodes.length < 2}>Previous</button>
            <button className="jammed-primary-control" type="button" onClick={playing ? pause : play} disabled={!hasVideo}>{playing ? 'Pause' : 'Play'}</button>
            <button type="button" onClick={stop} disabled={!hasVideo}>Stop</button>
            <button type="button" onClick={() => skip(-30)} disabled={!hasVideo}>Rewind 30</button>
            <button type="button" onClick={() => skip(30)} disabled={!hasVideo}>Forward 30</button>
            <button type="button" onClick={() => selectAdjacent(1)} disabled={!hasVideo || episodes.length < 2}>Next</button>
            <button type="button" onClick={() => setMuted(currentMuted => !currentMuted)} disabled={!hasVideo}>{muted ? 'Unmute' : 'Mute'}</button>
            <input
              className="jammed-volume"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={muted ? 0 : volume}
              onChange={(event) => {
                const nextVolume = Number(event.target.value);
                setVolume(nextVolume);
                setMuted(nextVolume === 0);
              }}
              disabled={!hasVideo}
              aria-label="Podcast volume"
            />
            <button type="button" onClick={cycleSpeed} disabled={!hasVideo}>{speed}x</button>
            <button type="button" onClick={() => setCaptions(currentCaptions => !currentCaptions)} disabled={!hasVideo || !selectedEpisode?.transcript}>{captions ? 'Captions On' : 'Captions'}</button>
            <button type="button" onClick={() => setTheater(currentTheater => !currentTheater)} disabled={!hasVideo}>{theater ? 'Standard' : 'Theater'}</button>
            <button type="button" onClick={toggleFullscreen} disabled={!hasVideo}>Fullscreen</button>
          </div>
        </div>
      </div>
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
