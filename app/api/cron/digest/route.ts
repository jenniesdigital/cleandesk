import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET() {
  try {
    if (!resendApiKey || !supabaseUrl || !serviceRoleKey) {
      console.log("[CleanDesk Digest Cron] Missing credentials. Skipping.");
      return NextResponse.json({ message: "Cron skipped — missing credentials.", digestsSent: 0 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const resend = new Resend(resendApiKey);

    const today = new Date().toISOString().split("T")[0];

    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("id, title, due_date, due_time, priority, status, user_id, project_id")
      .neq("status", "Completed");

    if (error) {
      console.error("[CleanDesk Digest Cron] Task query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ message: "No tasks found.", digestsSent: 0 });
    }

    const { data: authUsers, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) {
      console.error("[CleanDesk Digest Cron] Failed to list users:", usersError);
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    const userEmailMap = new Map<string, string>();
    for (const u of authUsers.users) {
      if (u.email) userEmailMap.set(u.id, u.email);
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name, email_allowed");

    const profileMap = new Map<string, { name: string; email_allowed: boolean }>();
    if (profiles) {
      for (const p of profiles) {
        profileMap.set(p.id, { name: p.name, email_allowed: p.email_allowed });
      }
    }

    const userTasksMap = new Map<string, { today: typeof tasks; upcoming: typeof tasks }>();
    for (const task of tasks) {
      const profile = profileMap.get(task.user_id);
      if (!profile || !profile.email_allowed) continue;

      if (!userTasksMap.has(task.user_id)) {
        userTasksMap.set(task.user_id, { today: [], upcoming: [] });
      }

      const bucket = task.due_date === today ? "today" : "upcoming";
      userTasksMap.get(task.user_id)![bucket].push(task);
    }

    let digestsSent = 0;

    for (const [userId, buckets] of userTasksMap) {
      const email = userEmailMap.get(userId);
      const profile = profileMap.get(userId);
      if (!email || !profile) continue;

      const todayTasks = buckets.today;
      const upcomingTasks = buckets.upcoming.slice(0, 5);

      const todayHtml = todayTasks.length > 0
        ? todayTasks.map(t => `
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #efebe3; color: #1a1a1a;">${t.title}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #efebe3;">
              <span style="background: ${t.priority === "High" ? "#fde8e8" : t.priority === "Medium" ? "#fef3cd" : "#f5f5f5"}; color: ${t.priority === "High" ? "#c52828" : t.priority === "Medium" ? "#856404" : "#666"}; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${t.priority}</span>
            </td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #efebe3; color: #666; font-size: 13px;">${t.due_time || "All day"}</td>
          </tr>
        `).join("")
        : `<tr><td colspan="3" style="padding: 16px; text-align: center; color: #999; font-size: 14px;">Nothing due today — enjoy the clear desk!</td></tr>`;

      const upcomingHtml = upcomingTasks.length > 0
        ? upcomingTasks.map(t => `
          <tr>
            <td style="padding: 6px 12px; border-bottom: 1px solid #efebe3; color: #1a1a1a; font-size: 13px;">${t.title}</td>
            <td style="padding: 6px 12px; border-bottom: 1px solid #efebe3; color: #666; font-size: 13px;">${t.due_date}</td>
          </tr>
        `).join("")
        : "";

      const { error: sendError } = await resend.emails.send({
        from: "CleanDesk <digest@cleandesk.app>",
        to: [email],
        subject: `Good morning, ${profile.name}! Here's your CleanDesk for today`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 20px; max-width: 560px; margin: 0 auto; background-color: #fcfbf9; border: 1px solid #efebe3; border-radius: 12px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
              <span style="font-size: 24px;">🧹</span>
              <span style="font-weight: 700; font-size: 18px; color: #1a1a1a;">CleanDesk</span>
              <span style="margin-left: auto; font-size: 12px; color: #999;">${new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</span>
            </div>

            <h2 style="color: #d96a26; margin: 0 0 4px 0;">Today's Focus</h2>
            <p style="color: #666; font-size: 14px; margin-top: 0; margin-bottom: 16px;">${todayTasks.length > 0 ? `You have ${todayTasks.length} task${todayTasks.length > 1 ? "s" : ""} scheduled today.` : "A clear day ahead."}</p>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; background: white; border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="background: #f5f0eb;">
                  <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #666; text-transform: uppercase;">Task</th>
                  <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #666; text-transform: uppercase;">Priority</th>
                  <th style="padding: 8px 12px; text-align: left; font-size: 12px; color: #666; text-transform: uppercase;">Time</th>
                </tr>
              </thead>
              <tbody>
                ${todayHtml}
              </tbody>
            </table>

            ${upcomingHtml ? `
              <h3 style="color: #1a1a1a; font-size: 15px; margin-bottom: 8px;">Coming Up</h3>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; background: white; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background: #f5f0eb;">
                    <th style="padding: 6px 12px; text-align: left; font-size: 12px; color: #666; text-transform: uppercase;">Task</th>
                    <th style="padding: 6px 12px; text-align: left; font-size: 12px; color: #666; text-transform: uppercase;">Due</th>
                  </tr>
                </thead>
                <tbody>
                  ${upcomingHtml}
                </tbody>
              </table>
            ` : ""}

            <div style="text-align: center; margin-top: 20px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://cleandeskai.vercel.app"}/dashboard"
                 style="display: inline-block; background: #d96a26; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                Open CleanDesk
              </a>
            </div>

            <p style="font-size: 11px; color: #bbb; margin-top: 20px; text-align: center;">
              Daily digest from CleanDesk. You received this because email reminders are enabled.
            </p>
          </div>
        `
      });

      if (sendError) {
        console.error(`[CleanDesk Digest Cron] Failed to send digest for user ${userId}:`, sendError);
      } else {
        digestsSent++;
      }
    }

    return NextResponse.json({
      message: "Digest cron completed successfully.",
      digestsSent
    });
  } catch (error: unknown) {
    console.error("Cron Digest Error:", error);
    const message = error instanceof Error ? error.message : "Cron failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
