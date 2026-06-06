import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const userId = searchParams.get("state");

    if (error || !code) {
      return NextResponse.redirect(`${appUrl}/dashboard?calendar=denied`);
    }

    if (!userId) {
      return NextResponse.redirect(`${appUrl}/dashboard?calendar=error&reason=missing_user`);
    }

    if (!clientId || !clientSecret || !supabaseUrl || !serviceRoleKey || !appUrl) {
      return NextResponse.json({ error: "Missing configuration" }, { status: 500 });
    }

    const redirectUri = `${appUrl}/api/auth/google/callback`;

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("[Google OAuth] Token exchange failed:", tokens);
      return NextResponse.redirect(`${appUrl}/dashboard?calendar=error`);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const tokenData = {
      user_id: userId,
      provider: "google",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from("user_tokens")
      .select("id")
      .eq("user_id", userId)
      .eq("provider", "google")
      .maybeSingle();

    if (existing) {
      await supabase.from("user_tokens").update(tokenData).eq("id", existing.id);
    } else {
      await supabase.from("user_tokens").insert(tokenData);
    }

    return NextResponse.redirect(`${appUrl}/dashboard?calendar=connected`);
  } catch (err) {
    console.error("[Google OAuth] Callback error:", err);
    return NextResponse.redirect(`${appUrl}/dashboard?calendar=error`);
  }
}
