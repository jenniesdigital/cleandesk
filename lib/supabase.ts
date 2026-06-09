import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== "your-supabase-project-url");

export const supabase = isSupabaseConfigured
  ? createBrowserClient(supabaseUrl!, supabaseAnonKey!)
  : null;
