import { NextResponse } from "next/server";
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

export async function GET() {
  try {
    // Basic verification - in production, secure this endpoint using a secret token header
    // e.g. Authorization: Bearer ${CRON_SECRET}

    console.log("[CleanDesk Reminder Cron] Running reminder checks...");

    if (!resendApiKey) {
      console.log("[Simulated Email Cron] Resend key not found. Logged reminder email logs successfully.");
      return NextResponse.json({
        message: "Cron completed in simulation mode (Resend API key missing).",
        remindersSent: 0
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
const resend = new Resend(resendApiKey);

    // In a real application, we would:
    // 1. Query Supabase for tasks due in exactly 24 hours or 1 hour
    // 2. Fetch the corresponding user's email from profiles/auth.users
    // 3. Check if user has email reminders enabled
    // 4. Send the emails using Resend

    // Below is a demonstration of how the email would be dispatched:
    /*
    const { data: sentData, error: sendError } = await resend.emails.send({
      from: "CleanDesk <reminders@cleandesk.app>",
      to: "user@example.com",
      subject: "Reminder: Your task is due tomorrow",
      html: `
        <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #fcfbf9; border: 1px solid #efebe3; border-radius: 12px;">
          <h2 style="color: #d96a26; margin-bottom: 5px;">CleanDesk Reminder</h2>
          <p style="color: #666; font-size: 14px; margin-top: 0;">Let's organize and execute.</p>
          <div style="background-color: white; padding: 15px; border-radius: 8px; border: 1px solid #efebe3; margin: 20px 0;">
            <strong style="font-size: 16px;">Task: Submit Assignment</strong>
            <p style="color: #555; margin-bottom: 0;">Due tomorrow at 10:00 AM</p>
          </div>
          <p style="font-size: 12px; color: #999;">You received this because your CleanDesk email reminders are turned on.</p>
        </div>
      `
    });
    */

    return NextResponse.json({
      message: "Cron completed successfully.",
      remindersSent: 0
    });
  } catch (error: unknown) {
    console.error("Cron Reminder Error:", error);
    const message = error instanceof Error ? error.message : "Cron failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
