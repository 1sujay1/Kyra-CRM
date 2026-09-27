import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database.types';

// Default Kyra Group Supabase project credentials for seamless client resilience
const DEFAULT_SUPABASE_URL = 'https://swyipnubewltavvndrcj.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_d-EtXA4ok4l795LXN0fbgw_Vn5OfmDC';

export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    DEFAULT_SUPABASE_ANON_KEY;

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
