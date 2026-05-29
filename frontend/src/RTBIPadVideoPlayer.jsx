import React, { useEffect, useMemo, useRef, useState } from 'react';

const CSS_ID = 'rtb-ipad-video-player-css';
const CSS_HREF = '/assets/video-player/rtb-ipad-player.css?v=20260529-control-states';
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

const icons = {
  play: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>,
  pause: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>,
  stop: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h12v12H6z" /></svg>,
  prev: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h2v12H6zM9 12l9 6V6z" /></svg>,
  next: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 6h2v12h-2zM6 18l9-6-9-6z" /></svg>,
  rewind: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 18V6l-8.5 6zM21.5 18V6L13 12z" /></svg>,
  forward: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 6v12l8.5-6zM2.5 6v12L11 12z" /></svg>,
  record: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7" /></svg>,
  sound: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4zm13.5 3A4.5 4.5 0 0 0 15 8v8a4.5 4.5 0 0 0 2.5-4z" /></svg>,
  cc: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4zM8 10.3c0-.9.7-1.6 1.7-1.6.7 0 1.2.2 1.7.7l-1 1c-.2-.2-.4-.3-.7-.3-.3 0-.6.2-.6.5v2.8c0 .3.3.5.6.5.3 0 .5-.1.8-.4l1 1c-.4.5-1 .8-1.8.8-1 0-1.7-.7-1.7-1.6v-3.4zm5.3 0c0-.9.7-1.6 1.7-1.6.7 0 1.2.2 1.7.7l-1 1c-.2-.2-.4-.3-.7-.3-.3 0-.6.2-.6.5v2.8c0 .3.3.5.6.5.3 0 .5-.1.8-.4l1 1c-.4.5-1 .8-1.8.8-1 0-1.7-.7-1.7-1.6v-3.4z" /></svg>,
  cog: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.4 13a7.8 7.8 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.8 7.8 0 0 0-1.7-1L14.9 3h-4l-.4 2.8a7.8 7.8 0 0 0-1.7 1l-2.5-1-2 3.5L6.4 11a7.8 7.8 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.8 7.8 0 0 0 1.7 1l.4 2.9h4l.4-2.9a7.8 7.8 0 0 0 1.7-1l2.5 1 2-3.5L19.4 13zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" /></svg>,
  theater: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18v12H3zM5 8v8h14V8z" /></svg>,
  mini: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4zM13 12h5v4h-5z" /></svg>,
  full: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10V5h5v2H7v3zm9-5h5v5h-2V7h-3zM7 14v3h3v2H5v-5zm10 3v-3h2v5h-5v-2z" /></svg>,
  live: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm7.8 1.2-1.6 1.2a7.2 7.2 0 0 1 0 3.2l1.6 1.2a9 9 0 0 0 0-5.6zM4.2 9.2a9 9 0 0 0 0 5.6l1.6-1.2a7.2 7.2 0 0 1 0-3.2z" /></svg>,
  studio: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h10v12H4zM16 9l4-2v10l-4-2z" /></svg>,
  test: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l3 3v15H6zM8 9h8v2H8zm0 4h8v2H8z" /></svg>
};

function useIPadPlayerCss() {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const existing = document.getElementById(CSS_ID);
    if (existing) {
      if (existing.getAttribute('href') !== CSS_HREF) {
        existing.setAttribute('href', CSS_HREF);
      }
      return;
    }
    const link = document.createElement('link');
    link.id = CSS_ID;
    link.rel = 'stylesheet';
    link.href = CSS_HREF;
    document.head.appendChild(link);
  }, []);
}

function formatTime(seconds = 0) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const mins = Math.floor((safeSeconds % 3600) / 60);
  const secs = String(safeSeconds % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(mins).padStart(2, '0')}:${secs}` : `${mins}:${secs}`;
}

function normalizeSources(item, fallbackSources = []) {
  const rawSources = item?.sources?.length ? item.sources : fallbackSources;
  if (!rawSources?.length && item?.src) return [{ src: item.src, type: item.type || '' }];
  return rawSources || [];
}

function sourceTypeFor(src = '', type = '') {
  if (type) return type;
  if (/\.m3u8($|\?)/i.test(src)) return 'application/x-mpegURL';
  if (/\.webm($|\?)/i.test(src)) return 'video/webm';
  if (/\.mov($|\?)/i.test(src)) return 'video/quicktime';
  return 'video/mp4';
}

function PlayerButton({
  icon = 'play',
  label,
  onClick,
  disabled = false,
  active = false,
  variant = 'silver',
  className = '',
  ariaPressed,
  pulse = false
}) {
  return (
    <button
      className={`rtb-control-btn rtb-${variant}-button ${active ? 'rtb-active' : ''} ${pulse ? 'rtb-pulse-active' : ''} ${className}`.trim()}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={ariaPressed}
    >
      <span className="rtb-btn-icon">{icons[icon] || icons.play}</span>
      <span className="rtb-btn-text">{label}</span>
    </button>
  );
}

export default function RTBIPadVideoPlayer({
  className = '',
  brand = 'Raising The Bar Officiating',
  title = '',
  logoSrc = '',
  status = 'Standby',
  live = false,
  aspect = 'wide',
  controlled = false,
  disabledControls = false,
  mediaContent = null,
  overlayContent = null,
  captionContent = null,
  sources = [],
  tracks = [],
  poster = '',
  playlist = [],
  selectedId = '',
  onSelect = () => {},
  emptyTitle = 'No video source connected',
  emptyMessage = 'A real production source will appear here when it is available.',
  playing: controlledPlaying = false,
  currentSeconds: controlledCurrent = 0,
  durationSeconds: controlledDuration = 0,
  progress: controlledProgress = 0,
  muted: controlledMuted = false,
  volume: controlledVolume = 1,
  captionsOn: controlledCaptions = false,
  speed: controlledSpeed = 1,
  recording = false,
  theaterMode = false,
  miniMode = false,
  settingsNote = '',
  showRecord = false,
  extraControls = [],
  onPlay,
  onPause,
  onStop,
  onPrevious,
  onNext,
  onRewind,
  onFastForward,
  onSkip,
  onSeek,
  onToggleMute,
  onVolume,
  onToggleCaptions,
  onSpeed,
  onSpeedValue,
  onToggleRecording,
  onToggleTheater,
  onToggleMini,
  onFullscreen,
  onPictureInPicture
}) {
  useIPadPlayerCss();
  const videoRef = useRef(null);
  const shellRef = useRef(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nativePlaying, setNativePlaying] = useState(false);
  const [nativeCurrent, setNativeCurrent] = useState(0);
  const [nativeDuration, setNativeDuration] = useState(0);
  const [nativeMuted, setNativeMuted] = useState(false);
  const [nativeVolume, setNativeVolume] = useState(0.85);
  const [nativeCaptions, setNativeCaptions] = useState(false);
  const [nativeSpeed, setNativeSpeed] = useState(1);
  const [nativeTheater, setNativeTheater] = useState(false);
  const [nativeMini, setNativeMini] = useState(false);
  const [pauseFlash, setPauseFlash] = useState(false);
  const [adjacentFlash, setAdjacentFlash] = useState('');
  const pauseFlashTimerRef = useRef(null);
  const adjacentFlashTimerRef = useRef(null);

  const selectedItem = useMemo(() => (
    playlist.find(item => item.id === selectedId) || playlist[0] || null
  ), [playlist, selectedId]);
  const nativeSources = useMemo(() => normalizeSources(selectedItem, sources), [selectedItem, sources]);
  const hasNativeVideo = !controlled && nativeSources.some(source => source?.src);
  const hasVideo = controlled ? Boolean(mediaContent) : hasNativeVideo;
  const disabled = disabledControls || !hasVideo;
  const playing = controlled ? controlledPlaying : nativePlaying;
  const duration = controlled ? controlledDuration : nativeDuration;
  const current = controlled ? controlledCurrent : nativeCurrent;
  const progress = controlled ? controlledProgress : (duration > 0 ? Math.min(100, (current / duration) * 100) : 0);
  const muted = controlled ? controlledMuted : nativeMuted;
  const activeVolume = controlled ? controlledVolume : nativeVolume;
  const captionsOn = controlled ? controlledCaptions : nativeCaptions;
  const speed = controlled ? controlledSpeed : nativeSpeed;
  const activeTheater = controlled ? theaterMode : nativeTheater;
  const activeMini = controlled ? miniMode : nativeMini;
  const playerTitle = selectedItem?.title || title || brand;

  useEffect(() => {
    if (controlled) return;
    const video = videoRef.current;
    if (!video) return;
    video.volume = nativeMuted ? 0 : nativeVolume;
    video.muted = nativeMuted;
    video.playbackRate = nativeSpeed;
  }, [controlled, nativeMuted, nativeSpeed, nativeVolume, selectedItem?.id]);

  useEffect(() => {
    if (controlled) return;
    setNativePlaying(false);
    setNativeCurrent(0);
    setNativeDuration(0);
  }, [controlled, selectedItem?.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video?.textTracks) return;
    Array.from(video.textTracks).forEach(track => {
      track.mode = captionsOn ? 'showing' : 'disabled';
    });
  }, [captionsOn, selectedItem?.id]);

  useEffect(() => () => {
    window.clearTimeout(pauseFlashTimerRef.current);
    window.clearTimeout(adjacentFlashTimerRef.current);
  }, []);

  function flashPauseButton() {
    window.clearTimeout(pauseFlashTimerRef.current);
    setPauseFlash(false);
    window.requestAnimationFrame(() => {
      setPauseFlash(true);
      pauseFlashTimerRef.current = window.setTimeout(() => setPauseFlash(false), 780);
    });
  }

  function flashAdjacentButton(direction) {
    window.clearTimeout(adjacentFlashTimerRef.current);
    setAdjacentFlash('');
    window.requestAnimationFrame(() => {
      setAdjacentFlash(direction);
      adjacentFlashTimerRef.current = window.setTimeout(() => setAdjacentFlash(''), 520);
    });
  }

  async function nativePlay() {
    const video = videoRef.current;
    if (!video) return;
    try {
      await video.play();
    } catch {
      setNativePlaying(false);
    }
  }

  function nativePause() {
    videoRef.current?.pause();
  }

  function nativeStop() {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    setNativeCurrent(0);
    setNativePlaying(false);
  }

  function nativeSeek(percent) {
    const video = videoRef.current;
    if (!video || nativeDuration <= 0) return;
    video.currentTime = (Math.max(0, Math.min(100, percent)) / 100) * nativeDuration;
  }

  function nativeSkip(seconds) {
    const video = videoRef.current;
    if (!video || nativeDuration <= 0) return;
    video.currentTime = Math.max(0, Math.min(nativeDuration, (video.currentTime || 0) + seconds));
  }

  function nativeAdjacent(direction) {
    if (!playlist.length) return;
    const currentIndex = Math.max(0, playlist.findIndex(item => item.id === selectedItem?.id));
    const nextIndex = Math.max(0, Math.min(playlist.length - 1, currentIndex + direction));
    onSelect(playlist[nextIndex].id);
  }

  function setVolumeValue(nextVolume) {
    const bounded = Math.max(0, Math.min(1, Number(nextVolume) || 0));
    if (controlled) onVolume?.(bounded);
    else {
      setNativeVolume(bounded);
      setNativeMuted(bounded === 0);
    }
  }

  function setSpeedValue(nextSpeed) {
    const safeSpeed = Number(nextSpeed) || 1;
    if (controlled) onSpeedValue?.(safeSpeed);
    else setNativeSpeed(safeSpeed);
  }

  function cycleSpeed() {
    if (controlled) {
      onSpeed?.();
      return;
    }
    setNativeSpeed(currentSpeed => {
      const nextIndex = (SPEEDS.indexOf(currentSpeed) + 1) % SPEEDS.length;
      return SPEEDS[nextIndex] || 1;
    });
  }

  function handlePlay() {
    if (controlled) onPlay?.();
    else nativePlay();
  }

  function handlePause() {
    flashPauseButton();
    if (controlled) onPause?.();
    else nativePause();
  }

  function handleStop() {
    if (controlled) onStop?.();
    else nativeStop();
  }

  function handlePrevious() {
    flashAdjacentButton('previous');
    if (controlled) onPrevious?.();
    else nativeAdjacent(-1);
  }

  function handleNext() {
    flashAdjacentButton('next');
    if (controlled) onNext?.();
    else nativeAdjacent(1);
  }

  function handleSkip(seconds) {
    if (controlled) {
      if (onSkip) {
        onSkip(seconds);
      } else if (seconds < 0) {
        onRewind?.();
      } else if (seconds > 0) {
        onFastForward?.();
      }
      return;
    }
    nativeSkip(seconds);
  }

  function handleSeek(percent) {
    if (controlled) onSeek?.(percent);
    else nativeSeek(percent);
  }

  function handleMute() {
    if (controlled) onToggleMute?.();
    else setNativeMuted(currentMuted => !currentMuted);
  }

  function handleCaptions() {
    if (controlled) onToggleCaptions?.();
    else setNativeCaptions(currentCaptions => !currentCaptions);
  }

  function handleFullscreen() {
    if (controlled && onFullscreen) {
      onFullscreen();
      return;
    }
    const node = shellRef.current;
    if (!node) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else node.requestFullscreen?.();
  }

  function handleTheater() {
    if (controlled) {
      onToggleTheater?.();
      return;
    }
    setNativeTheater(current => !current);
  }

  async function handleMini() {
    if (controlled) {
      (onToggleMini || onPictureInPicture)?.();
      return;
    }
    const video = videoRef.current;
    if (video?.requestPictureInPicture) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
          setNativeMini(false);
        } else {
          await video.requestPictureInPicture();
          setNativeMini(true);
        }
        return;
      } catch {
        setNativeMini(current => !current);
        return;
      }
    }
    setNativeMini(current => !current);
  }

  const stageMedia = controlled ? mediaContent : (
    hasNativeVideo ? (
      <video
        key={selectedItem?.id || nativeSources.map(source => source.src).join('|')}
        ref={videoRef}
        className="rtb-video-element"
        playsInline
        preload="metadata"
        poster={selectedItem?.poster || poster}
        onLoadedMetadata={(event) => setNativeDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setNativeCurrent(event.currentTarget.currentTime || 0)}
        onPlay={() => setNativePlaying(true)}
        onPause={() => setNativePlaying(false)}
        onEnded={() => {
          setNativePlaying(false);
        }}
      >
        {nativeSources.map(source => (
          <source key={source.src} src={source.src} type={sourceTypeFor(source.src, source.type)} />
        ))}
        {(selectedItem?.tracks || tracks).map(track => (
          <track key={`${track.src}-${track.label || track.srcLang || 'track'}`} {...track} />
        ))}
      </video>
    ) : (
      <div className="rtb-empty-state">
        {logoSrc && <img src={logoSrc} alt="" aria-hidden="true" />}
        <h3>{emptyTitle}</h3>
        <p>{emptyMessage}</p>
      </div>
    )
  );

  return (
    <section
      className={`rtb-ipad-player ${playing ? 'rtb-is-playing' : ''} ${activeTheater ? 'rtb-theater-active' : ''} ${activeMini ? 'rtb-mini-active' : ''} ${className}`.trim()}
      aria-label={`${playerTitle} video player`}
    >
      <div className="rtb-ipad-shell" ref={shellRef}>
        <div className="rtb-ipad-camera" aria-hidden="true"></div>
        <div className="rtb-ipad-glass">
          <div className="rtb-statusbar">
            <div className="rtb-status-left">
              {logoSrc && <img className="rtb-status-logo" src={logoSrc} alt="" aria-hidden="true" />}
              <span>{brand}</span>
            </div>
            <div className="rtb-status-brand">
              <span>{status}</span>
              {live && <small>Live</small>}
            </div>
            <div className="rtb-status-right">
              <span>{typeof navigator !== 'undefined' && navigator.onLine === false ? 'Offline' : 'Online'}</span>
            </div>
          </div>

          <div className={`rtb-screen rtb-screen-${aspect}`}>
            <div className="rtb-video-stage">
              {stageMedia}
              {overlayContent}
              {captionContent || (captionsOn && selectedItem?.transcript ? <div className="rtb-caption-strip">{selectedItem.transcript}</div> : null)}
              {!playing && !disabled && (
                <button className="rtb-center-play" type="button" onClick={handlePlay} aria-label={`Play ${playerTitle}`}>
                  {icons.play}
                </button>
              )}
              {live && <div className="rtb-live-badge">LIVE</div>}
            </div>

            <div className="rtb-control-dock">
              <div className="rtb-control-row rtb-control-row-top">
                <span className="rtb-timecode">{formatTime(current)}</span>
                <input
                  className="rtb-timeline"
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={Number.isFinite(progress) ? progress : 0}
                  style={{ '--value': `${Number.isFinite(progress) ? progress : 0}%` }}
                  onChange={(event) => handleSeek(Number(event.target.value))}
                  disabled={disabled}
                  aria-label="Video timeline"
                />
                <span className="rtb-timecode">{formatTime(duration)}</span>
              </div>
              <div className="rtb-control-row rtb-main-buttons" role="group" aria-label="Video controls">
                <PlayerButton icon="play" label="Play" variant="play" active={playing} onClick={handlePlay} disabled={disabled} />
                <PlayerButton icon="pause" label="Pause" variant="pause" pulse={pauseFlash} onClick={handlePause} disabled={disabled} />
                <PlayerButton icon="stop" label="Stop" onClick={handleStop} disabled={disabled} />
                <PlayerButton icon="prev" label="Prev" variant="skip" pulse={adjacentFlash === 'previous'} onClick={handlePrevious} disabled={disabled || (!controlled && playlist.length < 2)} />
                <PlayerButton icon="rewind" label="Rewind" variant="seek" onClick={() => handleSkip(-30)} disabled={disabled} />
                <PlayerButton icon="rewind" label="-10" variant="seek" onClick={() => handleSkip(-10)} disabled={disabled} />
                <PlayerButton icon="forward" label="+10" variant="seek" onClick={() => handleSkip(10)} disabled={disabled} />
                <PlayerButton icon="forward" label="Fast Fwd" variant="seek" onClick={() => handleSkip(30)} disabled={disabled} />
                <PlayerButton icon="next" label="Next" variant="skip" pulse={adjacentFlash === 'next'} onClick={handleNext} disabled={disabled || (!controlled && playlist.length < 2)} />
                {showRecord && (
                  <PlayerButton icon="record" label="Record" variant="record" active={recording} onClick={onToggleRecording} disabled={disabled || !onToggleRecording} ariaPressed={recording} />
                )}
                <PlayerButton icon="sound" label={muted ? 'Muted' : 'Sound'} active={!muted} onClick={handleMute} disabled={disabled} />
                <label className="rtb-volume-wrap">
                  <span className="sr-only">Volume</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={muted ? 0 : activeVolume}
                    style={{ '--value': `${(muted ? 0 : activeVolume) * 100}%` }}
                    onChange={(event) => setVolumeValue(Number(event.target.value))}
                    disabled={disabled}
                    aria-label="Video volume"
                  />
                </label>
                <PlayerButton icon="cc" label={captionsOn ? 'CC On' : 'CC'} variant="caption" active={captionsOn} onClick={handleCaptions} disabled={disabled} ariaPressed={captionsOn} />
                <PlayerButton icon="cog" label={`${Number(speed || 1).toFixed(1)}x`} variant="speed" onClick={cycleSpeed} disabled={disabled} />
                <PlayerButton icon="cog" label="Settings" variant="settings" active={settingsOpen} onClick={() => setSettingsOpen(currentOpen => !currentOpen)} />
                {extraControls.map(control => (
                  <PlayerButton
                    key={control.id || control.label}
                    icon={control.icon || 'cog'}
                    label={control.label}
                    variant={control.variant || 'silver'}
                    active={control.active}
                    disabled={control.disabled}
                    onClick={control.onClick}
                  />
                ))}
                <PlayerButton icon="theater" label="Theater" active={activeTheater} onClick={handleTheater} disabled={disabled} />
                <PlayerButton icon="mini" label="Mini" active={activeMini} onClick={handleMini} disabled={disabled} />
                <PlayerButton icon="full" label="Full" onClick={handleFullscreen} />
              </div>

              {settingsOpen && (
                <div className="rtb-settings-flyout">
                  <div className="rtb-settings-arrow" aria-hidden="true"></div>
                  <div className="rtb-settings-header">
                    <span className="rtb-settings-cog">{icons.cog}</span>
                    <div>
                      <strong>Settings</strong>
                      <small>Playback and production controls</small>
                    </div>
                  </div>
                  <label className="rtb-setting-line rtb-setting-line-select">
                    <span>Playback Speed</span>
                    <select value={speed} onChange={(event) => setSpeedValue(Number(event.target.value))} disabled={disabled}>
                      {SPEEDS.map(rate => <option key={rate} value={rate}>{rate.toFixed(2).replace(/\.00$/, '')}x</option>)}
                    </select>
                  </label>
                  <button className="rtb-setting-line rtb-menu-button" type="button" onClick={handleCaptions} disabled={disabled}>
                    <span>Closed Caption</span>
                    <b>{captionsOn ? 'On' : 'Off'}</b>
                  </button>
                  <button className="rtb-setting-line rtb-menu-button" type="button" onClick={handleMute} disabled={disabled}>
                    <span>Sound</span>
                    <b>{muted ? 'Muted' : 'On'}</b>
                  </button>
                  <label className="rtb-setting-line rtb-setting-line-select">
                    <span>Volume</span>
                    <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : activeVolume} onChange={(event) => setVolumeValue(Number(event.target.value))} disabled={disabled} />
                  </label>
                  <button className="rtb-setting-line rtb-menu-button" type="button" onClick={handleTheater} disabled={disabled}>
                    <span>Theater Screen</span>
                    <b>{activeTheater ? 'On' : 'Off'}</b>
                  </button>
                  <button className="rtb-setting-line rtb-menu-button" type="button" onClick={handleMini} disabled={disabled}>
                    <span>Picture-in-Picture</span>
                    <b>{activeMini ? 'On' : 'Open'}</b>
                  </button>
                  <button className="rtb-setting-line rtb-menu-button" type="button" onClick={handleFullscreen}>
                    <span>Full Screen</span>
                    <b>Open</b>
                  </button>
                  {extraControls.map(control => (
                    <button className="rtb-setting-line rtb-menu-button" key={`setting-${control.id || control.label}`} type="button" onClick={control.onClick} disabled={control.disabled}>
                      <span>{control.settingsLabel || control.label}</span>
                      <b>{control.active ? 'On' : 'Open'}</b>
                    </button>
                  ))}
                  {settingsNote && <p className="rtb-settings-note">{settingsNote}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
