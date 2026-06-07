import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  return new NextResponse(
    "<!DOCTYPE html><html><body><script>" +
    "localStorage.removeItem('cleandesk_projects');" +
    "localStorage.removeItem('cleandesk_tasks');" +
    "localStorage.removeItem('cleandesk_notes');" +
    "localStorage.removeItem('cleandesk_profile');" +
    "window.location.href = '/';" +
    "</script></body></html>",
    { headers: { "Content-Type": "text/html" } }
  );
}
