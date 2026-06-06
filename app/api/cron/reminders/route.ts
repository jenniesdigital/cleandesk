import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET() {
  try {
    if (!resendApiKey || !supabaseUrl || !serviceRoleKey) {
      console.log("[CleanDesk Reminder Cron] Missing credentials. Skipping.");
      return NextResponse.json({ message: "Cron skipped — missing credentials.", remindersSent: 0 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const resend = new Resend(resendApiKey);

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("id, title, due_date, due_time, user_id, project_id")
      .neq("status", "Completed")
      .not("due_date", "is", null);

    if (error) {
      console.error("[CleanDesk Reminder Cron] Task query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ message: "No tasks due.", remindersSent: 0 });
    }

    const userIds = [...new Set(tasks.map(t => t.user_id))];
    const { data: authUsers, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error("[CleanDesk Reminder Cron] Failed to list users:", usersError);
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    const userEmailMap = new Map<string, string>();
    for (const u of authUsers.users) {
      if (u.email) userEmailMap.set(u.id, u.email);
    }

    const userProfileMap = new Map<string, { name: string; email_allowed: boolean }>();
    for (const uid of userIds) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, email_allowed")
        .eq("id", uid)
        .single();
      if (profile) {
        userProfileMap.set(uid, { name: profile.name, email_allowed: profile.email_allowed });
      }
    }

    let remindersSent = 0;

    for (const task of tasks) {
      const profile = userProfileMap.get(task.user_id);
      const email = userEmailMap.get(task.user_id);

      if (!profile || !profile.email_allowed || !email) continue;

      const taskDue = new Date(`${task.due_date}T${task.due_time || "09:00"}:00`);
      const diffMs = taskDue.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      const is24hReminder = diffHours > 20 && diffHours < 26;
      const is1hReminder = diffHours > 0.5 && diffHours < 1.5;

      if (!is24hReminder && !is1hReminder) continue;

      const reminderLabel = is24hReminder ? "tomorrow" : "in 1 hour";

      const { error: sendError } = await resend.emails.send({
        from: "CleanDesk <reminders@cleandesk.app>",
        to: [email],
        subject: `Reminder: "${task.title}" is due ${reminderLabel}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #fcfbf9; border: 1px solid #efebe3; border-radius: 12px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
              <span style="font-size: 24px;">🧹</span>
              <span style="font-weight: 700; font-size: 18px; color: #1a1a1a;">CleanDesk</span>
            </div>
            <h2 style="color: #d96a26; margin: 0 0 4px 0;">Task Reminder</h2>
            <p style="color: #666; font-size: 14px; margin-top: 0;">Your desk is counting on you.</p>
            <div style="background-color: white; padding: 16px; border-radius: 8px; border: 1px solid #efebe3; margin: 20px 0;">
              <strong style="font-size: 16px; color: #1a1a1a;">${task.title}</strong>
              <p style="color: #555; margin: 8px 0 0 0; font-size: 14px;">
                Due ${reminderLabel}${task.due_time ? ` at ${task.due_time}` : ""}
              </p>
            </div>
            <p style="font-size: 12px; color: #999; margin-top: 20px;">
              You received this because your CleanDesk email reminders are turned on.
            </p>
          </div>
        `
      });

      if (sendError) {
        console.error(`[CleanDesk Reminder Cron] Failed to send for task ${task.id}:`, sendError);
      } else {
        remindersSent++;
      }
    }

    return NextResponse.json({
      message: "Cron completed successfully.",
      remindersSent
    });
  } catch (error: unknown) {
    console.error("Cron Reminder Error:", error);
    const message = error instanceof Error ? error.message : "Cron failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
