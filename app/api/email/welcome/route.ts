import { NextResponse } from "next/server";
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

export async function POST(request: Request) {
  try {
    if (!resendApiKey) {
      return NextResponse.json({ message: "No Resend key configured" }, { status: 200 });
    }

    const { email, name } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const resend = new Resend(resendApiKey);

    await resend.emails.send({
      from: "CleanDesk <onboarding@resend.dev>",
      to: email,
      subject: "Welcome to CleanDesk!",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #6C63FF;">Welcome to CleanDesk, ${name || "there"}!</h1>
          <p>Your workspace is ready. Here's how to get started:</p>
          <ul>
            <li><strong>Add tasks</strong> — Use the brain dump or add them one by one</li>
            <li><strong>Organise with projects</strong> — Group related tasks together</li>
            <li><strong>Set priorities</strong> — Focus on what matters most</li>
            <li><strong>Enable reminders</strong> — Never miss a deadline</li>
          </ul>
          <p>Start organising your day at <a href="https://cleandesk.app">cleandesk.app</a></p>
          <p style="color: #888; font-size: 0.85rem;">CleanDesk — A workspace that actually helps you get work done.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Welcome email error:", error);
    return NextResponse.json({ error: "Failed to send welcome email" }, { status: 500 });
  }
}
