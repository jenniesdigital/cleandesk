import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

export async function createCalendarEvent(
  userId: string,
  title: string,
  date: string,
  description?: string
) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: token } = await supabase
    .from("user_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .eq("provider", "google")
    .single();

  if (!token) return null;

  let accessToken = token.access_token;

  if (token.expires_at && new Date(token.expires_at) < new Date() && token.refresh_token) {
    const refreshed = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: token.refresh_token,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        grant_type: "refresh_token",
      }),
    });

    const newTokens = await refreshed.json();
    accessToken = newTokens.access_token;

    await supabase.from("user_tokens").update({
      access_token: newTokens.access_token,
      expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId).eq("provider", "google");
  }

  const event = {
    summary: title,
    description: description || "Created via CleanDesk",
    start: {
      dateTime: `${date}T10:00:00`,
      timeZone: "UTC",
    },
    end: {
      dateTime: `${date}T11:00:00`,
      timeZone: "UTC",
    },
  };

  const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) throw new Error("Failed to create Calendar event");

  const result = await response.json();
  return result.id;
}
