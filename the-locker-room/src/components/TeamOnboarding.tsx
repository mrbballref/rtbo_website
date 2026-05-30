'use client';

import { FormEvent, useState } from 'react';
import type { Team } from '@/types/locker-room';
import { apiFetch } from '@/lib/client-api';

export function TeamOnboarding({ onCreated }: { onCreated: (team: Team) => void }) {
  const [name, setName] = useState('Raising The Bar Officiating');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await apiFetch<{ team: Team }>('/api/teams', {
        method: 'POST',
        body: JSON.stringify({ name })
      });
      onCreated(response.team);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create team.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-screen">
      <form className="auth-card team-card" onSubmit={submit}>
        <img src="/brand/rtbo_logo_.webp" alt="Raising The Bar Officiating" width="120" height="120" />
        <p className="eyebrow">First secure workspace</p>
        <h1>Create your Locker Room team</h1>
        <p className="auth-copy">This creates the real team container used for uploads, downloads, viewing permissions, and notification recipients.</p>
        <label>
          Team name
          <input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} />
        </label>
        <button type="submit" className="primary-button" disabled={busy}>{busy ? 'Creating...' : 'Create team'}</button>
        {error && <p className="form-message error">{error}</p>}
      </form>
    </main>
  );
}
