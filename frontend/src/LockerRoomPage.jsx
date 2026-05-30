import React, { useEffect, useMemo, useRef, useState } from 'react';
import RTBIPadVideoPlayer from './RTBIPadVideoPlayer.jsx';
import './locker-room.css';

const API_URL = import.meta.env.VITE_RTBO_API_URL || '/api';

async function readJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    const error = new Error(data.message || 'The Locker Room request failed.');
    error.status = response.status;
    throw error;
  }
  return data;
}

async function apiGet(endpoint) {
  const response = await fetch(`${API_URL}${endpoint}`, { credentials: 'include' });
  return readJson(response);
}

async function apiPostJson(endpoint, payload) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include'
  });
  return readJson(response);
}

async function apiPostForm(endpoint, payload) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    body: payload,
    credentials: 'include'
  });
  return readJson(response);
}

function formatBytes(value = 0) {
  const bytes = Number(value) || 0;
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = bytes / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDate(value = '') {
  if (!value) return 'Date not set';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function getVideoDuration(file) {
  return new Promise((resolve) => {
    if (!file) {
      resolve(null);
      return;
    }
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

function normalizeFilm(film = {}) {
  return {
    ...film,
    id: String(film.id || ''),
    teamId: Number(film.teamId || 0),
    tracks: Array.isArray(film.tracks) ? film.tracks : []
  };
}

function EmptySignInGate({ onCreateAccount, onSignIn }) {
  return (
    <section className="locker-room-auth rtbo-section" aria-labelledby="locker-room-auth-title">
      <div className="locker-room-auth-panel">
        <p className="eyebrow">Secure film platform</p>
        <h2 id="locker-room-auth-title">Sign in to open The Locker Room.</h2>
        <p>The Locker Room uses your RTBO account to protect team rooms, private uploads, secure film playback, download logs, and upload notifications.</p>
        <div className="locker-room-auth-actions">
          <button className="btn" type="button" onClick={onSignIn}>Sign In</button>
          <button className="btn secondary dark-btn" type="button" onClick={onCreateAccount}>Create Account</button>
        </div>
      </div>
    </section>
  );
}

function TeamRoomCreateForm({ onCreate, busy }) {
  const [name, setName] = useState('');

  function submit(event) {
    event.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim()).then(() => setName('')).catch(() => {});
  }

  return (
    <form className="locker-room-create-form" onSubmit={submit}>
      <label>
        <span>New team room</span>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter team room name" minLength={2} required />
      </label>
      <button className="btn" type="submit" disabled={busy || name.trim().length < 2}>{busy ? 'Creating...' : 'Create Team Room'}</button>
    </form>
  );
}

function FilmUploadForm({ teams, selectedTeamId, onUploaded }) {
  const [form, setForm] = useState({
    teamId: selectedTeamId || '',
    title: '',
    opponent: '',
    gameDate: '',
    venue: '',
    competitionLevel: '',
    downloadEnabled: true
  });
  const [videoFile, setVideoFile] = useState(null);
  const [captionFile, setCaptionFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setForm((current) => ({ ...current, teamId: selectedTeamId || current.teamId || '' }));
  }, [selectedTeamId]);

  const canUpload = teams.some((team) => String(team.id) === String(form.teamId) && ['owner', 'admin', 'uploader'].includes(team.role));

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!videoFile || !canUpload) return;
    setBusy(true);
    setMessage('Uploading secure Locker Room film...');
    try {
      const durationSeconds = await getVideoDuration(videoFile);
      const payload = new FormData();
      payload.append('action', 'upload_film');
      payload.append('teamId', form.teamId);
      payload.append('title', form.title);
      payload.append('opponent', form.opponent);
      payload.append('gameDate', form.gameDate);
      payload.append('venue', form.venue);
      payload.append('competitionLevel', form.competitionLevel);
      payload.append('downloadEnabled', form.downloadEnabled ? '1' : '0');
      if (durationSeconds !== null) payload.append('durationSeconds', String(durationSeconds));
      payload.append('video', videoFile);
      if (captionFile) payload.append('caption', captionFile);

      const data = await apiPostForm('/locker-room.php', payload);
      onUploaded(data);
      setForm((current) => ({
        ...current,
        title: '',
        opponent: '',
        gameDate: '',
        venue: '',
        competitionLevel: '',
        downloadEnabled: true
      }));
      setVideoFile(null);
      setCaptionFile(null);
      event.currentTarget.reset();
      setMessage(data.message || 'Film uploaded.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="locker-room-upload-card" onSubmit={submit}>
      <div className="locker-room-card-head">
        <p className="eyebrow">Film upload</p>
        <h3>Upload real game film</h3>
        <p>Videos are stored privately and streamed through a protected RTBO endpoint.</p>
      </div>
      <div className="locker-room-field-grid">
        <label>
          <span>Team room</span>
          <select value={form.teamId} onChange={(event) => updateField('teamId', event.target.value)} required>
            {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
        </label>
        <label>
          <span>Film title</span>
          <input value={form.title} onChange={(event) => updateField('title', event.target.value)} minLength={2} required />
        </label>
        <label>
          <span>Opponent</span>
          <input value={form.opponent} onChange={(event) => updateField('opponent', event.target.value)} />
        </label>
        <label>
          <span>Game date</span>
          <input type="date" value={form.gameDate} onChange={(event) => updateField('gameDate', event.target.value)} />
        </label>
        <label>
          <span>Venue</span>
          <input value={form.venue} onChange={(event) => updateField('venue', event.target.value)} />
        </label>
        <label>
          <span>Level / event</span>
          <input value={form.competitionLevel} onChange={(event) => updateField('competitionLevel', event.target.value)} />
        </label>
      </div>
      <div className="locker-room-file-row">
        <label className="locker-room-file-picker">
          <span>Video file</span>
          <input type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v,.mp4,.webm,.mov,.m4v" onChange={(event) => setVideoFile(event.target.files?.[0] || null)} required />
          <strong>{videoFile ? videoFile.name : 'Choose game film'}</strong>
        </label>
        <label className="locker-room-file-picker">
          <span>Closed captions</span>
          <input type="file" accept="text/vtt,.vtt" onChange={(event) => setCaptionFile(event.target.files?.[0] || null)} />
          <strong>{captionFile ? captionFile.name : 'Optional .vtt file'}</strong>
        </label>
        <label className="locker-room-check">
          <input type="checkbox" checked={form.downloadEnabled} onChange={(event) => updateField('downloadEnabled', event.target.checked)} />
          <span>Enable secure downloads</span>
        </label>
      </div>
      <button className="btn" type="submit" disabled={busy || !canUpload || !videoFile || form.title.trim().length < 2}>{busy ? 'Uploading...' : 'Upload Film'}</button>
      {!canUpload && <p className="locker-room-note">Your role can view this team room but cannot upload film.</p>}
      {message && <p className="locker-room-message">{message}</p>}
    </form>
  );
}

function FilmLibrary({ films, selectedFilmId, onSelect }) {
  if (films.length === 0) {
    return (
      <div className="locker-room-empty-card">
        <h3>No game film has been uploaded to this team room yet.</h3>
        <p>The player will stay empty until a real film file is uploaded.</p>
      </div>
    );
  }

  return (
    <div className="locker-room-film-list" role="list" aria-label="Locker Room game film library">
      {films.map((film) => (
        <article className={`locker-room-film-card ${film.id === selectedFilmId ? 'is-selected' : ''}`} key={film.id} role="listitem">
          <button type="button" onClick={() => onSelect(film.id)}>
            <span>{formatDate(film.gameDate)}</span>
            <strong>{film.title}</strong>
            <small>{[film.opponent, film.venue, film.competitionLevel].filter(Boolean).join(' / ') || film.originalFilename}</small>
          </button>
          <dl>
            <div><dt>Size</dt><dd>{formatBytes(film.sizeBytes)}</dd></div>
            <div><dt>Views</dt><dd>{film.viewCount}</dd></div>
            <div><dt>Downloads</dt><dd>{film.downloadCount}</dd></div>
          </dl>
          {film.downloadEnabled && <a href={film.downloadUrl} className="locker-room-download-link">Download</a>}
        </article>
      ))}
    </div>
  );
}

export default function LockerRoomPage({ user, onCreateAccount, onSignIn }) {
  const [teams, setTeams] = useState([]);
  const [films, setFilms] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(0);
  const [selectedFilmId, setSelectedFilmId] = useState('');
  const [loading, setLoading] = useState(false);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [status, setStatus] = useState('');
  const viewedFilmIdsRef = useRef(new Set());

  const normalizedFilms = useMemo(() => films.map(normalizeFilm), [films]);
  const selectedFilm = normalizedFilms.find((film) => film.id === selectedFilmId) || normalizedFilms[0] || null;
  const selectedTeam = teams.find((team) => Number(team.id) === Number(selectedTeamId)) || teams[0] || null;
  const playlist = normalizedFilms.map((film) => ({
    id: film.id,
    title: film.title,
    sources: film.videoUrl ? [{ src: film.videoUrl, type: film.mimeType || 'video/mp4' }] : [],
    tracks: film.tracks,
    transcript: ''
  }));

  async function loadLockerRoom(teamId = selectedTeamId) {
    if (!user) return;
    setLoading(true);
    setStatus('');
    try {
      const suffix = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
      const data = await apiGet(`/locker-room.php${suffix}`);
      setTeams(data.teams || []);
      setFilms((data.films || []).map(normalizeFilm));
      setSelectedTeamId(Number(data.selectedTeamId || data.teams?.[0]?.id || 0));
      setSelectedFilmId((current) => {
        const nextFilms = (data.films || []).map(normalizeFilm);
        return nextFilms.some((film) => film.id === current) ? current : (nextFilms[0]?.id || '');
      });
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    viewedFilmIdsRef.current = new Set();
    if (user) loadLockerRoom(0);
  }, [user?.id]);

  useEffect(() => {
    if (!selectedFilm?.id || viewedFilmIdsRef.current.has(selectedFilm.id)) return;
    viewedFilmIdsRef.current.add(selectedFilm.id);
    apiPostJson('/locker-room.php', {
      action: 'record_event',
      filmId: selectedFilm.id,
      eventType: 'view',
      metadata: { source: 'locker-room-player' }
    })
      .then((data) => {
        if (data.film) {
          setFilms((current) => current.map((film) => String(film.id) === String(data.film.id) ? normalizeFilm(data.film) : film));
        }
      })
      .catch(() => {});
  }, [selectedFilm?.id]);

  async function createTeam(name) {
    setCreatingTeam(true);
    setStatus('');
    try {
      const data = await apiPostJson('/locker-room.php', { action: 'create_team', name });
      setTeams(data.teams || []);
      setFilms((data.films || []).map(normalizeFilm));
      setSelectedTeamId(Number(data.team?.id || data.selectedTeamId || 0));
      setSelectedFilmId('');
      setStatus(data.message || 'Team room created.');
    } catch (error) {
      setStatus(error.message);
      throw error;
    } finally {
      setCreatingTeam(false);
    }
  }

  function handleUpload(data) {
    setTeams(data.teams || teams);
    setFilms((data.films || []).map(normalizeFilm));
    setSelectedTeamId(Number(data.film?.teamId || data.selectedTeamId || selectedTeamId));
    setSelectedFilmId(String(data.film?.id || ''));
    setStatus(data.message || 'Locker Room updated.');
  }

  function changeTeam(event) {
    const nextTeamId = Number(event.target.value);
    setSelectedTeamId(nextTeamId);
    setSelectedFilmId('');
    loadLockerRoom(nextTeamId);
  }

  if (!user) {
    return <EmptySignInGate onCreateAccount={onCreateAccount} onSignIn={onSignIn} />;
  }

  return (
    <section className="locker-room-page rtbo-section" aria-labelledby="locker-room-title">
      <div className="locker-room-shell">
        <div className="locker-room-heading">
          <div>
            <p className="eyebrow">Secure team film rooms</p>
            <h2 id="locker-room-title">The Locker Room</h2>
            <p>Upload, review, stream, and download real game film with RTBO account-based access.</p>
          </div>
          <TeamRoomCreateForm onCreate={createTeam} busy={creatingTeam} />
        </div>

        {teams.length > 0 ? (
          <div className="locker-room-toolbar">
            <label>
              <span>Active team room</span>
              <select value={selectedTeam?.id || ''} onChange={changeTeam}>
                {teams.map((team) => <option key={team.id} value={team.id}>{team.name} / {team.role}</option>)}
              </select>
            </label>
            <div className="locker-room-user-chip">
              <span>{user.name || user.email}</span>
              <strong>{user.role || 'member'}</strong>
            </div>
          </div>
        ) : (
          <div className="locker-room-empty-card">
            <h3>Create the first team room to begin.</h3>
            <p>Team rooms control uploads, playback access, download permissions, and film activity logs.</p>
          </div>
        )}

        <div className="locker-room-grid">
          <aside className="locker-room-library-panel">
            <div className="locker-room-card-head">
              <p className="eyebrow">Film library</p>
              <h3>{selectedTeam?.name || 'No team room selected'}</h3>
              <p>{loading ? 'Loading secure film list...' : 'Only real uploaded film appears in this library.'}</p>
            </div>
            <FilmLibrary films={normalizedFilms} selectedFilmId={selectedFilm?.id || ''} onSelect={setSelectedFilmId} />
          </aside>

          <main className="locker-room-player-panel">
            <RTBIPadVideoPlayer
              className="locker-room-ipad-player"
              brand="The Locker Room"
              title={selectedFilm?.title || 'The Locker Room'}
              logoSrc="/assets/images/logo.png"
              status={selectedFilm ? 'Ready' : 'Awaiting Upload'}
              playlist={playlist}
              selectedId={selectedFilm?.id || ''}
              onSelect={setSelectedFilmId}
              emptyTitle="No Locker Room film selected"
              emptyMessage="Upload or choose real game film to activate secure playback."
              settingsNote="The Locker Room player streams private uploaded film through RTBO account permissions."
            />

            {teams.length > 0 && (
              <FilmUploadForm teams={teams} selectedTeamId={selectedTeam?.id || selectedTeamId} onUploaded={handleUpload} />
            )}
          </main>
        </div>

        {status && <p className="locker-room-message locker-room-global-message">{status}</p>}
      </div>
    </section>
  );
}
