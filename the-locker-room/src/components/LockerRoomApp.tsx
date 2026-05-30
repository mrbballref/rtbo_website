'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { GameFilm, Team } from '@/types/locker-room';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';
import { apiFetch } from '@/lib/client-api';
import { AuthPanel } from '@/components/AuthPanel';
import { TeamOnboarding } from '@/components/TeamOnboarding';
import { FilmSidebar } from '@/components/FilmSidebar';
import { FilmUploadPanel } from '@/components/FilmUploadPanel';
import { IpadVideoPlayer } from '@/components/player/IpadVideoPlayer';

export function LockerRoomApp() {
  const supabase = getSupabaseBrowserClient();
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [films, setFilms] = useState<GameFilm[]>([]);
  const [selectedFilmId, setSelectedFilmId] = useState<string | null>(null);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingFilms, setLoadingFilms] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session ?? null);
      setAuthReady(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setTeams([]);
        setFilms([]);
        setSelectedTeamId('');
        setSelectedFilmId(null);
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  const loadTeams = useCallback(async () => {
    setLoadingTeams(true);
    try {
      const response = await apiFetch<{ teams: Team[] }>('/api/teams');
      setTeams(response.teams);
      setSelectedTeamId((current) => current || response.teams[0]?.id || '');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Could not load teams.');
    } finally {
      setLoadingTeams(false);
    }
  }, []);

  const loadFilms = useCallback(async (teamId: string) => {
    if (!teamId) return;
    setLoadingFilms(true);
    try {
      const response = await apiFetch<{ films: GameFilm[] }>(`/api/films?teamId=${teamId}`);
      setFilms(response.films);
      setSelectedFilmId((current) => {
        if (current && response.films.some((film) => film.id === current)) return current;
        return response.films.find((film) => film.status === 'ready')?.id ?? response.films[0]?.id ?? null;
      });
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Could not load films.');
    } finally {
      setLoadingFilms(false);
    }
  }, []);

  useEffect(() => {
    if (session) void loadTeams();
  }, [loadTeams, session]);

  useEffect(() => {
    if (selectedTeamId) void loadFilms(selectedTeamId);
  }, [loadFilms, selectedTeamId]);

  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? null;
  const selectedFilm = films.find((film) => film.id === selectedFilmId) ?? null;
  const selectedIndex = useMemo(() => films.findIndex((film) => film.id === selectedFilmId), [films, selectedFilmId]);

  const selectFilm = (film: GameFilm) => {
    setSelectedFilmId(film.id);
  };

  const refreshFilm = (updated: GameFilm) => {
    setFilms((current) => current.map((film) => (film.id === updated.id ? updated : film)));
  };

  const addOrRefreshFilm = (updated: GameFilm) => {
    setFilms((current) => {
      const exists = current.some((film) => film.id === updated.id);
      if (exists) return current.map((film) => (film.id === updated.id ? updated : film));
      return [updated, ...current];
    });
    setSelectedFilmId(updated.id);
  };

  const downloadFilm = async (film: GameFilm) => {
    try {
      setToast(`Preparing secure download for ${film.title}...`);
      const response = await apiFetch<{ signedUrl: string; filename: string }>(`/api/films/${film.id}/download`, {
        method: 'POST',
        body: JSON.stringify({})
      });
      const anchor = document.createElement('a');
      anchor.href = response.signedUrl;
      anchor.download = response.filename;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setToast(`Download started: ${response.filename}`);
      if (selectedTeamId) void loadFilms(selectedTeamId);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Download failed.');
    }
  };

  const batchDownload = async (queue: GameFilm[]) => {
    for (const film of queue) {
      await downloadFilm(film);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (!authReady) {
    return (
      <main className="loading-screen">
        <img src="/brand/rtbo_logo_.webp" alt="Raising The Bar Officiating" width="120" height="120" />
        <p>Loading The Locker Room...</p>
      </main>
    );
  }

  if (!session) return <AuthPanel />;

  if (!loadingTeams && teams.length === 0) {
    return <TeamOnboarding onCreated={(team) => {
      setTeams([team]);
      setSelectedTeamId(team.id);
    }} />;
  }

  return (
    <main className="locker-room-app">
      {selectedTeam && (
        <FilmSidebar
          teams={teams}
          selectedTeamId={selectedTeamId}
          onTeamChange={(teamId) => {
            setSelectedTeamId(teamId);
            setSelectedFilmId(null);
          }}
          films={films}
          selectedFilmId={selectedFilmId}
          onSelectFilm={selectFilm}
          onDownloadFilm={downloadFilm}
          onBatchDownload={batchDownload}
          onSignOut={signOut}
          loading={loadingFilms}
        />
      )}

      <section className="main-stage">
        <div className="app-status-row">
          <div>
            <p className="eyebrow">Secure film room</p>
            <h2>{selectedTeam?.name ?? 'Loading team...'}</h2>
          </div>
          <div className="status-pill">{session.user.email}</div>
        </div>

        <IpadVideoPlayer
          film={selectedFilm}
          hasNext={selectedIndex >= 0 && selectedIndex < films.length - 1}
          hasPrevious={selectedIndex > 0}
          onNext={() => {
            if (selectedIndex >= 0 && selectedIndex < films.length - 1) setSelectedFilmId(films[selectedIndex + 1].id);
          }}
          onPrevious={() => {
            if (selectedIndex > 0) setSelectedFilmId(films[selectedIndex - 1].id);
          }}
          onFilmRefresh={refreshFilm}
        />

        {selectedTeam && (
          <FilmUploadPanel
            team={selectedTeam}
            selectedFilm={selectedFilm}
            onUploaded={addOrRefreshFilm}
            onAssetUploaded={addOrRefreshFilm}
          />
        )}
      </section>

      {toast && (
        <button type="button" className="toast" onClick={() => setToast('')}>
          {toast}
        </button>
      )}
    </main>
  );
}
