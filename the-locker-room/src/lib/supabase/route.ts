import { createClient, type User } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import type { Database } from '@/lib/db-types';
import { requireEnv } from '@/lib/env';

export type AuthenticatedRequest = {
  user: User;
  accessToken: string;
};

export async function getAuthenticatedUser(request: NextRequest): Promise<AuthenticatedRequest | null> {
  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return null;
  }

  const supabase = createClient<Database>(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'), {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  return { user: data.user, accessToken: token };
}
