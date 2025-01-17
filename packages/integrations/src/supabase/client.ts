import { createClient } from '@supabase/supabase-js';
import type { Database } from '@squad/core';

export const createSupabaseClient = (url: string, key: string) => {
  return createClient<Database>(url, key);
};

export type SupabaseClient = ReturnType<typeof createSupabaseClient>;