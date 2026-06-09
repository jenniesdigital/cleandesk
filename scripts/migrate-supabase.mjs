import pg from "pg";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(resolve(__dirname, "..", ".env.local"), "utf-8");
const envVars = Object.fromEntries(
  envContent.split("\n").filter(l => l.trim() && !l.startsWith("#")).map(l => {
    const eq = l.indexOf("=");
    return [l.slice(0, eq).trim(), l.slice(eq + 1).trim()];
  })
);

const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
const projectRef = "qaqtlidswgxqxlrvmnqn";

async function tryManagementApi() {
  // Try using Supabase Management API with service_role key
  const sql = `
    -- Add missing columns to projects
    ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active'::text;
    ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

    -- Add missing columns to tasks
    ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;
    ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb;
    ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS notes text;
    ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

    -- Ensure RLS policies exist (create if not, using IF NOT EXISTS won't error)
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own projects' AND tablename = 'projects') THEN
        CREATE POLICY "Users can manage their own projects" ON public.projects
          FOR ALL USING (auth.uid() = user_id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own tasks' AND tablename = 'tasks') THEN
        CREATE POLICY "Users can manage their own tasks" ON public.tasks
          FOR ALL USING (auth.uid() = user_id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own notes' AND tablename = 'notes') THEN
        CREATE POLICY "Users can manage their own notes" ON public.notes
          FOR ALL USING (auth.uid() = user_id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own tokens' AND tablename = 'user_tokens') THEN
        CREATE POLICY "Users can manage their own tokens" ON public.user_tokens
          FOR ALL USING (auth.uid() = user_id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own profile' AND tablename = 'profiles') THEN
        CREATE POLICY "Users can view their own profile" ON public.profiles
          FOR SELECT USING (auth.uid() = id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own profile' AND tablename = 'profiles') THEN
        CREATE POLICY "Users can insert their own profile" ON public.profiles
          FOR INSERT WITH CHECK (auth.uid() = id);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own profile' AND tablename = 'profiles') THEN
        CREATE POLICY "Users can update their own profile" ON public.profiles
          FOR UPDATE USING (auth.uid() = id);
      END IF;
    END $$;
  `.trim();

  // Method 1: Try the Transaction Pooler with service_role as password
  console.log("Attempting direct DB connection via pooler...");
  const pool = new pg.Pool({
    host: `aws-0-us-west-1.pooler.supabase.com`,
    port: 6543,
    database: "postgres",
    user: `postgres.${projectRef}`,
    password: serviceRoleKey,
    max: 1,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();
    console.log("Connected! Running migration SQL...");
    await client.query(sql);
    console.log("Migration SQL executed successfully!");
    client.release();
    return true;
  } catch (err) {
    console.log("Connection with service_role key failed:", err.message);
  } finally {
    await pool.end();
  }

  // Method 2: Try with direct DB host
  console.log("Attempting direct DB connection...");
  const pool2 = new pg.Pool({
    host: `db.${projectRef}.supabase.co`,
    port: 5432,
    database: "postgres",
    user: "postgres",
    password: serviceRoleKey,
    max: 1,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client2 = await pool2.connect();
    console.log("Connected directly! Running migration SQL...");
    await client2.query(sql);
    console.log("Migration SQL executed successfully!");
    client2.release();
    return true;
  } catch (err2) {
    console.log("Direct connection failed:", err2.message);
  } finally {
    await pool2.end();
  }

  // Method 3: Try Session Pooler
  console.log("Attempting session pooler connection...");
  const pool3 = new pg.Pool({
    host: `aws-0-us-west-1.pooler.supabase.com`,
    port: 5432,
    database: "postgres",
    user: `postgres.${projectRef}`,
    password: serviceRoleKey,
    max: 1,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client3 = await pool3.connect();
    console.log("Connected via session pooler! Running migration SQL...");
    await client3.query(sql);
    console.log("Migration SQL executed successfully!");
    client3.release();
    return true;
  } catch (err3) {
    console.log("Session pooler failed:", err3.message);
  } finally {
    await pool3.end();
  }

  return false;
}

tryManagementApi()
  .then((success) => {
    if (success) {
      console.log("\nMigration complete! Cross-device sync should now work.");
    } else {
      console.log("\nCould not connect to database automatically.");
      console.log("Please run the SQL in supabase-schema.sql and supabase-migration-002-sort-order.sql");
      console.log("in your Supabase dashboard SQL editor.");
      console.log("\nManual steps:");
      console.log("1. Go to https://supabase.com/dashboard/project/qaqtlidswgxqxlrvmnqn/sql/new");
      console.log(`2. Paste and run the SQL from the migration files`);
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error("Unexpected error:", err);
    process.exit(1);
  });
