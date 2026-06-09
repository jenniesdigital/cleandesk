import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ success: false, error: "Supabase not configured" });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Not authenticated" });
  }

  const body = await req.json();
  const results: Record<string, { success: boolean; count: number; error?: string }> = {};

  if (body.profile) {
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id, name: body.profile.name || "User",
        role: body.profile.role || [],
        calendar_allowed: body.profile.calendar_allowed || false,
        email_allowed: body.profile.email_allowed ?? true,
        reminder_preferences: body.profile.reminder_preferences || {},
      });
      results.profile = { success: !error, count: 1, error: error?.message };
    } catch (e: unknown) {
      results.profile = { success: false, count: 0, error: String(e) };
    }
  }

  if (body.projects?.length) {
    try {
      for (const p of body.projects) {
        const { error } = await supabase.from("projects").upsert({
          id: p.id, user_id: user.id, title: p.title,
          description: p.description || "", is_archived: p.is_archived || false,
          status: p.status || "Active", sort_order: p.sort_order ?? 0,
        }, { onConflict: "id" });
        if (error) throw error;
      }
      results.projects = { success: true, count: body.projects.length };
    } catch (e: unknown) {
      results.projects = { success: false, count: 0, error: String(e) };
    }
  }

  if (body.tasks?.length) {
    try {
      for (const t of body.tasks) {
        const { error } = await supabase.from("tasks").upsert({
          id: t.id, user_id: user.id, project_id: t.project_id || null,
          title: t.title, description: t.description || "",
          due_date: t.due_date || null, due_time: t.due_time || null,
          priority: t.priority || "Medium", status: t.status || "To Do",
          is_archived: t.is_archived || false, completed_at: t.completed_at || null,
          tags: t.tags || [], notes: t.notes || "",
          sort_order: t.sort_order ?? 0, recurring_rule: t.recurring_rule || null,
        }, { onConflict: "id" });
        if (error) throw error;
      }
      results.tasks = { success: true, count: body.tasks.length };
    } catch (e: unknown) {
      results.tasks = { success: false, count: 0, error: String(e) };
    }
  }

  if (body.notes?.length) {
    try {
      for (const n of body.notes) {
        const { error } = await supabase.from("notes").upsert({
          id: n.id, user_id: user.id, project_id: n.project_id,
          title: n.title || "Untitled Note", content: n.content || "",
          created_at: n.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });
        if (error) throw error;
      }
      results.notes = { success: true, count: body.notes.length };
    } catch (e: unknown) {
      results.notes = { success: false, count: 0, error: String(e) };
    }
  }

  return NextResponse.json({ success: true, user_id: user.id, results });
}
