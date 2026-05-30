'use client';

import { FormEvent, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export function AuthPanel() {
  const supabase = getSupabaseBrowserClient();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      if (mode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage('Signed in. Loading The Locker Room...');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        });
        if (error) throw error;
        setMessage('Account created. Confirm the email address if Supabase email confirmation is enabled.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-screen">
      <div className="auth-card">
        <img src="/brand/rtbo_logo_.webp" alt="Raising The Bar Officiating" width="132" height="132" />
        <p className="eyebrow">Raising The Bar Officiating</p>
        <h1>The Locker Room</h1>
        <p className="auth-copy">Secure game film viewing, downloading, captions, recording, audit logs, and email notifications.</p>
        <form onSubmit={submit} className="auth-form">
          {mode === 'sign-up' && (
            <label>
              Full name
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" />
            </label>
          )}
          <label>
            Email address
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} required minLength={8} />
          </label>
          <button type="submit" className="primary-button" disabled={busy}>
            {busy ? 'Working...' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        {message && <p className="form-message">{message}</p>}
        <button type="button" className="link-button" onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}>
          {mode === 'sign-in' ? 'Create a secure Locker Room account' : 'Already have an account? Sign in'}
        </button>
      </div>
    </main>
  );
}
