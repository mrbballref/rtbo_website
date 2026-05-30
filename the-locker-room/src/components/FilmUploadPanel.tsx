'use client';

import { FormEvent, useMemo, useState } from 'react';
import type { GameFilm, SignedUploadTarget, Team } from '@/types/locker-room';
import { LANGUAGE_OPTIONS } from '@/lib/constants/languages';
import { VIDEO_QUALITY_OPTIONS } from '@/lib/constants/quality';
import { apiFetch } from '@/lib/client-api';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { Icon } from '@/components/player/Icon';

async function getVideoDuration(file: File) {
  return new Promise<number | null>((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : null;
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.src = url;
  });
}

async function uploadSigned(target: SignedUploadTarget, file: File) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.storage.from(target.bucket).uploadToSignedUrl(target.path, target.token, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: true
  });
  if (error) throw error;
}

export function FilmUploadPanel({
  team,
  selectedFilm,
  onUploaded,
  onAssetUploaded
}: {
  team: Team;
  selectedFilm: GameFilm | null;
  onUploaded: (film: GameFilm) => void;
  onAssetUploaded: (film: GameFilm) => void;
}) {
  const canUpload = team.role === 'owner' || team.role === 'admin' || team.role === 'uploader';
  const canManageNotifications = team.role === 'owner' || team.role === 'admin';
  const [title, setTitle] = useState('');
  const [opponent, setOpponent] = useState('');
  const [gameDate, setGameDate] = useState('');
  const [venue, setVenue] = useState('');
  const [competitionLevel, setCompetitionLevel] = useState('');
  const [downloadEnabled, setDownloadEnabled] = useState(true);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null);
  const [subtitleLanguage, setSubtitleLanguage] = useState('en');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const readyToUpload = useMemo(() => title.trim().length >= 2 && videoFile && canUpload, [canUpload, title, videoFile]);

  const uploadFilm = async (event: FormEvent) => {
    event.preventDefault();
    if (!videoFile) return;
    setBusy(true);
    setMessage('Creating secure upload target...');
    try {
      const durationSeconds = await getVideoDuration(videoFile);
      const upload = await apiFetch<{
        filmId: string;
        bucket: string;
        video: SignedUploadTarget;
        subtitle: SignedUploadTarget | null;
      }>('/api/films/upload-url', {
        method: 'POST',
        body: JSON.stringify({
          teamId: team.id,
          title,
          opponent: opponent || null,
          gameDate: gameDate || null,
          venue: venue || null,
          competitionLevel: competitionLevel || null,
          downloadEnabled,
          video: { name: videoFile.name, type: videoFile.type || 'video/mp4', size: videoFile.size },
          subtitle: subtitleFile
            ? { name: subtitleFile.name, type: subtitleFile.type || 'text/vtt', size: subtitleFile.size, languageCode: subtitleLanguage }
            : null
        })
      });

      setMessage('Uploading video to private film storage...');
      await uploadSigned(upload.video, videoFile);

      if (subtitleFile && upload.subtitle) {
        setMessage('Uploading closed captions...');
        await uploadSigned(upload.subtitle, subtitleFile);
      }

      setMessage('Finalizing upload and sending notifications...');
      const completed = await apiFetch<{ film: GameFilm }>('/api/films/complete', {
        method: 'POST',
        body: JSON.stringify({
          filmId: upload.filmId,
          durationSeconds,
          subtitleAssetId: upload.subtitle?.assetId ?? null
        })
      });

      onUploaded(completed.film);
      setTitle('');
      setOpponent('');
      setGameDate('');
      setVenue('');
      setCompetitionLevel('');
      setVideoFile(null);
      setSubtitleFile(null);
      setMessage('Upload complete. The film is now available in the left sidebar.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  if (!canUpload) {
    return (
      <section className="upload-panel">
        <h2>Film upload</h2>
        <p>Your current role can view film but cannot upload new files.</p>
      </section>
    );
  }

  return (
    <section className="upload-panel" aria-label="Upload and asset manager">
      <details open>
        <summary><Icon name="upload" /> Upload game film</summary>
        <form onSubmit={uploadFilm} className="upload-form">
          <div className="form-grid">
            <label>
              Film title
              <input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={2} />
            </label>
            <label>
              Opponent
              <input value={opponent} onChange={(event) => setOpponent(event.target.value)} />
            </label>
            <label>
              Game date
              <input value={gameDate} onChange={(event) => setGameDate(event.target.value)} type="date" />
            </label>
            <label>
              Venue
              <input value={venue} onChange={(event) => setVenue(event.target.value)} />
            </label>
            <label>
              Level / event
              <input value={competitionLevel} onChange={(event) => setCompetitionLevel(event.target.value)} />
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={downloadEnabled} onChange={(event) => setDownloadEnabled(event.target.checked)} />
              Enable downloads
            </label>
          </div>
          <label>
            Video file
            <input type="file" accept="video/mp4,video/quicktime,video/webm,video/x-m4v" onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)} required />
          </label>
          <div className="form-grid">
            <label>
              Optional captions (.vtt)
              <input type="file" accept="text/vtt,.vtt" onChange={(event) => setSubtitleFile(event.target.files?.[0] ?? null)} />
            </label>
            <label>
              Caption language
              <select value={subtitleLanguage} onChange={(event) => setSubtitleLanguage(event.target.value)}>
                {LANGUAGE_OPTIONS.map((language) => (
                  <option key={language.code} value={language.code}>{language.label}</option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit" className="primary-button" disabled={!readyToUpload || busy}>{busy ? 'Uploading...' : 'Upload to Locker Room'}</button>
        </form>
      </details>

      {selectedFilm && <AssetManager film={selectedFilm} onAssetUploaded={onAssetUploaded} />}
      {canManageNotifications && <NotificationManager team={team} />}
      {message && <p className="form-message">{message}</p>}
    </section>
  );
}

function AssetManager({ film, onAssetUploaded }: { film: GameFilm; onAssetUploaded: (film: GameFilm) => void }) {
  const [assetKind, setAssetKind] = useState<'video' | 'subtitle'>('video');
  const [quality, setQuality] = useState('720p60');
  const [languageCode, setLanguageCode] = useState('en');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    setMessage('Creating asset upload target...');
    try {
      const response = await apiFetch<{ assetId: string; target: SignedUploadTarget }>(`/api/films/${film.id}/assets/upload-url`, {
        method: 'POST',
        body: JSON.stringify({
          kind: assetKind,
          qualityLabel: assetKind === 'video' ? quality : null,
          languageCode: assetKind === 'subtitle' ? languageCode : null,
          file: { name: file.name, type: file.type || (assetKind === 'subtitle' ? 'text/vtt' : 'video/mp4'), size: file.size }
        })
      });
      setMessage('Uploading asset to private storage...');
      await uploadSigned(response.target, file);
      setMessage('Activating asset...');
      const completed = await apiFetch<{ film: GameFilm }>(`/api/films/${film.id}/assets/complete`, {
        method: 'POST',
        body: JSON.stringify({ assetId: response.assetId })
      });
      onAssetUploaded(completed.film);
      setFile(null);
      setMessage('Asset is ready. Settings will show the new real asset.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Asset upload failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <details className="asset-manager">
      <summary>Manage selected film assets</summary>
      <p className="hint">Add real quality variants or WebVTT captions for: <strong>{film.title}</strong></p>
      <form onSubmit={submit} className="upload-form compact">
        <div className="form-grid">
          <label>
            Asset type
            <select value={assetKind} onChange={(event) => setAssetKind(event.target.value as 'video' | 'subtitle')}>
              <option value="video">Video quality variant</option>
              <option value="subtitle">Subtitle / closed caption</option>
            </select>
          </label>
          {assetKind === 'video' ? (
            <label>
              Quality label
              <select value={quality} onChange={(event) => setQuality(event.target.value)}>
                {VIDEO_QUALITY_OPTIONS.filter((option) => option !== 'Auto').map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              Language
              <select value={languageCode} onChange={(event) => setLanguageCode(event.target.value)}>
                {LANGUAGE_OPTIONS.map((language) => (
                  <option key={language.code} value={language.code}>{language.label}</option>
                ))}
              </select>
            </label>
          )}
        </div>
        <label>
          Asset file
          <input
            type="file"
            accept={assetKind === 'subtitle' ? 'text/vtt,.vtt' : 'video/mp4,video/quicktime,video/webm,video/x-m4v'}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            required
          />
        </label>
        <button className="secondary-button" disabled={!file || busy}>{busy ? 'Uploading...' : 'Upload selected asset'}</button>
      </form>
      {message && <p className="form-message">{message}</p>}
    </details>
  );
}

function NotificationManager({ team }: { team: Team }) {
  const [email, setEmail] = useState('');
  const [events, setEvents] = useState<Array<'upload' | 'view' | 'download' | 'recording'>>(['upload', 'view', 'download']);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const toggle = (eventName: 'upload' | 'view' | 'download' | 'recording') => {
    setEvents((current) => (current.includes(eventName) ? current.filter((item) => item !== eventName) : [...current, eventName]));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await apiFetch(`/api/teams/${team.id}/notifications`, {
        method: 'POST',
        body: JSON.stringify({ email, events, enabled: true })
      });
      setEmail('');
      setMessage('Notification recipient saved. Future matching events will send email.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save notification recipient.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <details className="notification-manager">
      <summary>Email notifications</summary>
      <form onSubmit={submit} className="upload-form compact">
        <label>
          Recipient email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <div className="event-checks">
          {(['upload', 'view', 'download', 'recording'] as const).map((eventName) => (
            <label key={eventName}>
              <input type="checkbox" checked={events.includes(eventName)} onChange={() => toggle(eventName)} />
              {eventName}
            </label>
          ))}
        </div>
        <button className="secondary-button" disabled={busy || events.length === 0}>{busy ? 'Saving...' : 'Save recipient'}</button>
      </form>
      {message && <p className="form-message">{message}</p>}
    </details>
  );
}
