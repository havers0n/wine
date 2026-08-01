import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

let client: SupabaseClient<Database> | null = null;

export class SupabaseConfigurationError extends Error {
  constructor() {
    super('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
    this.name = 'SupabaseConfigurationError';
  }
}

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!isSupabaseConfigured || !supabaseUrl || !supabasePublishableKey) {
    throw new SupabaseConfigurationError();
  }

  if (!client) {
    client = createClient<Database>(supabaseUrl, supabasePublishableKey, {
      db: { schema: 'public' },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return client;
}
