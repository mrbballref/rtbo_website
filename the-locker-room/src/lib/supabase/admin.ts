import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/db-types';
import { requireEnv } from '@/lib/env';

export function createSupabaseAdminClient() {
  return createClient<Database>(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
