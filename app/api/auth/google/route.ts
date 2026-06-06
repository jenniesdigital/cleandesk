import { NextRequest, NextResponse } from "next/server";

const clientId = process.env.GOOGLE_CLIENT_ID;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

export async function GET(request: NextRequest) {
  if (!clientId || !appUrl) {
    return NextResponse.json({ error: "Missing Google OAuth configuration" }, { status: 500 });
  }

  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const redirectUri = `${appUrl}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
    access_type: "offline",
    prompt: "consent",
    state: userId,
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
