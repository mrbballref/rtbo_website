'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameFilm, SignedPlaybackResponse } from '@/types/locker-room';
import { VIDEO_QUALITY_OPTIONS } from '@/lib/constants/quality';
import { formatClock } from '@/lib/format';
import { apiFetch } from '@/lib/client-api';
import { ControlButton } from '@/components/player/ControlButton';
import { SettingsFlyout } from '@/components/player/SettingsFlyout';
import { ToggleSwitch } from '@/components/player/ToggleSwitch';
import { Icon } from '@/components/player/Icon';

type CapturedVideo = HTMLVideoElement & {
  captureStream?: () => MediaStream;
  mozCaptureStream?: () => MediaStream;
};

export function IpadVideoPlayer({
  film,
  hasNext,
  hasPrevious,
  onNext,
  onPrevious,
  onFilmRefresh
}: {
  film: GameFilm | null;
  hasNext: boolean;
  hasPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onFilmRefresh: (film: GameFilm) => void;
}) {
  const videoRef = useRef<CapturedVideo | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const reverseTimer = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunks = useRef<Blob[]>([]);
  const recordingStartedAt = useRef<string | null>(null);

  const [source, setSource] = useState<string>('');
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceError, setSourceError] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [quality, setQuality] = useState<string>('Auto');
  const [language, setLanguage] = useState('en');
  const [captionsOn, setCaptionsOn] = useState(false);
  const [subtitleTracks, setSubtitleTracks] = useState<SignedPlaybackResponse['subtitles']>([]);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theater, setTheater] = useState(false);
  const [goldActive, setGoldActive] = useState<'rewind' | 'fast-forward' | null>(null);

  const availableQualities = useMemo(() => {
    const set = new Set<string>(['Auto']);
    for (const asset of film?.assets ?? []) {
      if (asset.kind === 'video' && asset.status === 'ready' && asset.quality_label) {
        set.add(asset.quality_label);
      }
    }
    return set;
  }, [film]);

  const stopReverse = useCallback(() => {
    if (reverseTimer.current) {
      window.clearInterval(reverseTimer.current);
      reverseTimer.current = null;
    }
  }, []);

  const startReverse = useCallback(() => {
    const video = videoRef.current;
    if (!video || speed >= 0) return;
    stopReverse();
    video.pause();
    reverseTimer.current = window.setInterval(() => {
      const nextTime = Math.max(0, video.currentTime - Math.abs(speed) * 0.1);
      video.currentTime = nextTime;
      setCurrentTime(nextTime);
      if (nextTime <= 0) {
        stopReverse();
        setIsPlaying(false);
        if (autoPlay && hasPrevious) onPrevious();
      }
    }, 100);
  }, [autoPlay, hasPrevious, onPrevious, speed, stopReverse]);

  const loadPlaybackSource = useCallback(
    async (requestedQuality = quality) => {
      if (!film) return;
      setSourceLoading(true);
      setSourceError('');
      try {
        const response = await apiFetch<SignedPlaybackResponse>(`/api/films/${film.id}/view-url`, {
          method: 'POST',
          body: JSON.stringify({ qualityLabel: requestedQuality })
        });
        setSource(response.signedUrl);
        setSubtitleTracks(response.subtitles);
        setQuality(response.selectedQuality === 'Original' ? 'Auto' : response.selectedQuality);
        if (response.film) onFilmRefresh(response.film);
        queueMicrotask(() => {
          const video = videoRef.current;
          if (video && autoPlay) {
            void video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
          }
        });
      } catch (error) {
        setSourceError(error instanceof Error ? error.message : 'Playback failed.');
        setSource('');
      } finally {
        setSourceLoading(false);
      }
    },
    [autoPlay, film, onFilmRefresh, quality]
  );

  useEffect(() => {
    setSource('');
    setSourceError('');
    setCurrentTime(0);
    setDuration(0);
    setQuality('Auto');
    setSubtitleTracks([]);
    stopReverse();
    setIsPlaying(false);
    if (film?.status === 'ready') {
      void loadPlaybackSource('Auto');
    }
  }, [film?.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
  }, [volume]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (speed > 0) {
      video.playbackRate = speed;
      if (isPlaying) {
        stopReverse();
        void video.play().catch(() => undefined);
      }
    } else if (isPlaying) {
      startReverse();
    }
  }, [isPlaying, speed, startReverse, stopReverse]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const tracks = Array.from(video.textTracks);
    for (const track of tracks) {
      track.mode = captionsOn && track.language === language ? 'showing' : 'disabled';
    }
  }, [captionsOn, language, subtitleTracks, source]);

  useEffect(() => {
    return () => stopReverse();
  }, [stopReverse]);

  const play = useCallback(() => {
    const video = videoRef.current;
    if (!video || !source) return;
    if (speed < 0) {
      setIsPlaying(true);
      startReverse();
      return;
    }
    stopReverse();
    video.playbackRate = speed;
    void video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  }, [source, speed, startReverse, stopReverse]);

  const pause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    stopReverse();
    video.pause();
    setIsPlaying(false);
  }, [stopReverse]);

  const stop = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    stopReverse();
    video.pause();
    video.currentTime = 0;
    setCurrentTime(0);
    setIsPlaying(false);
  }, [stopReverse]);

  const skipBy = useCallback((seconds: number, direction: 'rewind' | 'fast-forward') => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(Math.max(0, video.currentTime + seconds), duration || video.duration || 0);
    setCurrentTime(video.currentTime);
    setGoldActive(direction);
    window.setTimeout(() => setGoldActive(null), 420);
  }, [duration]);

  const seek = (next: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = next;
    setCurrentTime(next);
  };

  const toggleFullscreen = async () => {
    const node = shellRef.current;
    if (!node) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
    } else {
      await node.requestFullscreen().catch(() => undefined);
    }
  };

  const togglePictureInPicture = async () => {
    const video = videoRef.current;
    if (!video || !document.pictureInPictureEnabled) return;
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture().catch(() => undefined);
    } else {
      await video.requestPictureInPicture().catch(() => undefined);
    }
  };

  const toggleRecording = async () => {
    const video = videoRef.current;
    if (!video || !film) return;

    if (isRecording && recorderRef.current) {
      recorderRef.current.stop();
      return;
    }

    const stream = video.captureStream?.() ?? video.mozCaptureStream?.();
    if (!stream) {
      setSourceError('Recording is not supported by this browser for the current video stream.');
      return;
    }

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    recordingChunks.current = [];
    recordingStartedAt.current = new Date().toISOString();
    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordingChunks.current.push(event.data);
    };

    recorder.onstop = () => {
      const endedAt = new Date().toISOString();
      const blob = new Blob(recordingChunks.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${film.title.replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)+/g, '') || 'locker-room-recording'}.webm`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      setIsRecording(false);
      void apiFetch(`/api/films/${film.id}/recording`, {
        method: 'POST',
        body: JSON.stringify({
          startedAt: recordingStartedAt.current,
          endedAt,
          seconds: blob.size > 0 ? Math.round((new Date(endedAt).getTime() - new Date(recordingStartedAt.current ?? endedAt).getTime()) / 1000) : 0,
          mimeType
        })
      }).catch(() => undefined);
    };

    recorder.start(1000);
    setIsRecording(true);
  };

  const selectQuality = (nextQuality: string) => {
    if (!VIDEO_QUALITY_OPTIONS.includes(nextQuality as (typeof VIDEO_QUALITY_OPTIONS)[number])) return;
    if (nextQuality !== 'Auto' && !availableQualities.has(nextQuality)) return;
    setQuality(nextQuality);
    void loadPlaybackSource(nextQuality);
  };

  const onEnded = () => {
    stopReverse();
    setIsPlaying(false);
    if (autoPlay && hasNext) onNext();
  };

  const noFilm = !film;
  const isReady = film?.status === 'ready';

  return (
    <section className={`player-zone ${theater ? 'theater-mode' : ''}`} aria-label="The Locker Room video player">
      <div className="ipad-shell" ref={shellRef}>
        <div className="ipad-camera" />
        <div className="ipad-speaker" />
        <div className="ipad-screen">
          <div className="screen-topbar">
            <div>
              <p>The Locker Room</p>
              <strong>{film?.title ?? 'Select a real uploaded game film'}</strong>
            </div>
            <button type="button" className="mini-chip" onClick={() => setSettingsOpen((open) => !open)} aria-label="Open settings">
              <Icon name="settings" /> Settings
            </button>
          </div>

          <div className="video-stage">
            {sourceLoading && <div className="video-overlay">Loading secure playback link...</div>}
            {sourceError && <div className="video-overlay error">{sourceError}</div>}
            {noFilm && <div className="video-overlay">Upload or select a game film from the left sidebar.</div>}
            {film && !isReady && <div className="video-overlay">This film is still processing its upload.</div>}
            <video
              ref={videoRef}
              className="game-video"
              src={source}
              playsInline
              preload="metadata"
              onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
              onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => {
                if (!reverseTimer.current) setIsPlaying(false);
              }}
              onEnded={onEnded}
              controls={false}
            >
              {subtitleTracks.map((track) => (
                <track
                  key={track.id}
                  kind="captions"
                  src={track.src}
                  srcLang={track.languageCode}
                  label={track.label}
                  default={captionsOn && track.languageCode === language}
                />
              ))}
            </video>
          </div>

          <div className="timeline-wrap">
            <span>{formatClock(currentTime)}</span>
            <input
              aria-label="Timeline"
              type="range"
              min="0"
              max={duration || 0}
              step="0.05"
              value={Math.min(currentTime, duration || currentTime)}
              onChange={(event) => seek(Number(event.target.value))}
              disabled={!source}
            />
            <span>{formatClock(duration)}</span>
          </div>

          <div className="control-dock">
            <ToggleSwitch label="AutoPlay" checked={autoPlay} onChange={setAutoPlay} />
            <ControlButton icon="previous" label="Previous" onClick={onPrevious} disabled={!hasPrevious} />
            <ControlButton icon="rewind" label="Rewind" tone="gold" active={goldActive === 'rewind'} onClick={() => skipBy(-10, 'rewind')} disabled={!source} />
            <ControlButton icon="play" label="Play" tone="green" active={isPlaying && speed > 0} onClick={play} disabled={!source} />
            <ControlButton icon="pause" label="Pause" onClick={pause} disabled={!source} />
            <ControlButton icon="stop" label="Stop" onClick={stop} disabled={!source} />
            <ControlButton icon="fast-forward" label="Fast Forward" tone="gold" active={goldActive === 'fast-forward'} onClick={() => skipBy(10, 'fast-forward')} disabled={!source} />
            <ControlButton icon="next" label="Next" onClick={onNext} disabled={!hasNext} />
            <div className="volume-control" title="Volume">
              <Icon name="volume" />
              <input
                aria-label="Volume"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
              />
            </div>
            <ControlButton icon="record" label="Record" tone="scarlet" active={isRecording} onClick={toggleRecording} disabled={!source} />
            <button type="button" className="settings-button" onClick={() => setSettingsOpen((open) => !open)} aria-label="Settings">
              <Icon name="settings" />
            </button>
          </div>
        </div>
        <SettingsFlyout
          open={settingsOpen}
          speed={speed}
          onSpeedChange={setSpeed}
          language={language}
          onLanguageChange={setLanguage}
          captionsOn={captionsOn}
          onCaptionsChange={setCaptionsOn}
          quality={quality}
          onQualityChange={selectQuality}
          availableQualities={availableQualities}
          theater={theater}
          onTheater={() => setTheater((value) => !value)}
          onFullscreen={toggleFullscreen}
          onPictureInPicture={togglePictureInPicture}
          onClose={() => setSettingsOpen(false)}
        />
      </div>
    </section>
  );
}
