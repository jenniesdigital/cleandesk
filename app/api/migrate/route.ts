import { NextResponse } from "next/server";

const sql = `
-- Add missing columns to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active'::text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Add missing columns to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- Ensure RLS policies exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own projects' AND tablename = 'projects') THEN
    CREATE POLICY "Users can manage their own projects" ON public.projects FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own tasks' AND tablename = 'tasks') THEN
    CREATE POLICY "Users can manage their own tasks" ON public.tasks FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own notes' AND tablename = 'notes') THEN
    CREATE POLICY "Users can manage their own notes" ON public.notes FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own tokens' AND tablename = 'user_tokens') THEN
    CREATE POLICY "Users can manage their own tokens" ON public.user_tokens FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own profile' AND tablename = 'profiles') THEN
    CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own profile' AND tablename = 'profiles') THEN
    CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own profile' AND tablename = 'profiles') THEN
    CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;
`;

export async function GET() {
  const supabaseMgmtToken = process.env.SUPABASE_ACCESS_TOKEN;
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/(.+)\.supabase\.co/)?.[1];

  // Method 1: Try Management API with SUPABASE_ACCESS_TOKEN
  if (supabaseMgmtToken && projectRef) {
    try {
      const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/sql`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseMgmtToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: sql }),
      });
      if (res.ok) {
        const result = await res.text();
        return NextResponse.json({ success: true, method: "management-api", result });
      }
      return NextResponse.json({ success: false, method: "management-api", error: await res.text() });
    } catch (err: unknown) {
      return NextResponse.json({ success: false, method: "management-api", error: String(err) });
    }
  }

  // Method 2: Try direct pg connection from server runtime
  let pgResult = null;
  try {
    const pg = await import("pg");
    const pool = new pg.default.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
    });
    const client = await pool.connect();
    await client.query(sql);
    client.release();
    await pool.end();
    pgResult = { success: true };
  } catch (err: unknown) {
    pgResult = { success: false, error: String(err) };
  }

  if (pgResult.success) {
    return NextResponse.json({ success: true, method: "direct-db" });
  }

  // Both methods failed — return SQL for manual execution
  return NextResponse.json({
    success: false,
    message: "Could not run migration automatically.",
    pgError: pgResult.error,
    instructions: {
      step: "1. Go to your Supabase dashboard SQL editor",
      url: `https://supabase.com/dashboard/project/${projectRef || "your-project-ref"}/sql/new`,
      step2: "2. Paste and run the SQL below",
    },
    sql,
  });
}
