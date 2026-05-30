'use client';

import { useMemo, useState } from 'react';
import type { GameFilm, Team } from '@/types/locker-room';
import { dateLabel, formatBytes } from '@/lib/format';
import { Icon } from '@/components/player/Icon';

export function FilmSidebar({
  teams,
  selectedTeamId,
  onTeamChange,
  films,
  selectedFilmId,
  onSelectFilm,
  onDownloadFilm,
  onBatchDownload,
  onSignOut,
  loading
}: {
  teams: Team[];
  selectedTeamId: string;
  onTeamChange: (teamId: string) => void;
  films: GameFilm[];
  selectedFilmId: string | null;
  onSelectFilm: (film: GameFilm) => void;
  onDownloadFilm: (film: GameFilm) => void;
  onBatchDownload: (films: GameFilm[]) => void;
  onSignOut: () => void;
  loading: boolean;
}) {
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return films;
    return films.filter((film) => {
      return [film.title, film.opponent, film.venue, film.original_filename, film.competition_level]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [films, query]);

  const selectedDownloads = films.filter((film) => selectedIds.has(film.id) && film.status === 'ready' && film.download_enabled);

  const toggleSelected = (filmId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(filmId)) next.delete(filmId);
      else next.add(filmId);
      return next;
    });
  };

  return (
    <aside className="film-sidebar" aria-label="Game film library and download queue">
      <div className="sidebar-brand">
        <img src="/brand/rtbo_logo_.webp" alt="Raising The Bar Officiating" width="74" height="74" />
        <div>
          <p>Raising The Bar</p>
          <h1>The Locker Room</h1>
        </div>
      </div>

      <label className="sidebar-select">
        <span>Team room</span>
        <select value={selectedTeamId} onChange={(event) => onTeamChange(event.target.value)}>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name} - {team.role}
            </option>
          ))}
        </select>
      </label>

      <div className="queue-toolbar">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search real uploaded film"
          aria-label="Search films"
        />
        <button type="button" className="secondary-button" onClick={() => onBatchDownload(selectedDownloads)} disabled={selectedDownloads.length === 0}>
          <Icon name="download" /> Queue ({selectedDownloads.length})
        </button>
      </div>

      <div className="film-list" role="list">
        {loading && <div className="film-empty">Loading secure film list...</div>}
        {!loading && filtered.length === 0 && (
          <div className="film-empty">
            <strong>No game film in this room yet.</strong>
            <span>Upload film below. The player does not include fake data or sample videos.</span>
          </div>
        )}
        {filtered.map((film) => (
          <article
            role="listitem"
            className={`film-card ${film.id === selectedFilmId ? 'selected' : ''}`}
            key={film.id}
            onDoubleClick={() => onSelectFilm(film)}
          >
            <div className="film-card-top">
              <input
                type="checkbox"
                checked={selectedIds.has(film.id)}
                onChange={() => toggleSelected(film.id)}
                aria-label={`Add ${film.title} to download queue`}
                disabled={film.status !== 'ready' || !film.download_enabled}
              />
              <button type="button" onClick={() => onSelectFilm(film)} className="film-title-button">
                <strong>{film.title}</strong>
                <span>{film.original_filename}</span>
              </button>
            </div>
            <dl className="film-meta">
              <div><dt>Opponent</dt><dd>{film.opponent || 'Not set'}</dd></div>
              <div><dt>Date</dt><dd>{dateLabel(film.game_date)}</dd></div>
              <div><dt>Size</dt><dd>{formatBytes(film.size_bytes)}</dd></div>
              <div><dt>Status</dt><dd className={`status ${film.status}`}>{film.status}</dd></div>
              <div><dt>Views</dt><dd>{film.view_count}</dd></div>
              <div><dt>Downloads</dt><dd>{film.download_count}</dd></div>
            </dl>
            <div className="film-actions">
              <button type="button" className="secondary-button" onClick={() => onSelectFilm(film)} disabled={film.status !== 'ready'}>
                Watch
              </button>
              <button type="button" className="secondary-button" onClick={() => onDownloadFilm(film)} disabled={film.status !== 'ready' || !film.download_enabled}>
                <Icon name="download" /> Download
              </button>
            </div>
          </article>
        ))}
      </div>

      <button type="button" className="logout-button" onClick={onSignOut}>Sign out</button>
    </aside>
  );
}
