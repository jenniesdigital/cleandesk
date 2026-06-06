import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { title, date, description, providerToken } = await request.json();

    if (!title || !date) {
      return NextResponse.json({ error: "Title and Date are required" }, { status: 400 });
    }

    // If there is no provider token (local development / dummy login),
    // we simulate successful calendar integration so it doesn't crash.
    if (!providerToken || providerToken === "dummy-token") {
      console.log(`[Simulated Google Calendar] Added event: "${title}" on ${date}`);
      return NextResponse.json({
        success: true,
        message: `Task "${title}" added to your Google Calendar (simulated).`,
        eventId: `simulated-event-${Date.now()}`
      });
    }

    // Call Google Calendar API using the OAuth provider token
    const event = {
      summary: title,
      description: description || "Created via CleanDesk",
      start: {
        dateTime: `${date}T10:00:00`,
        timeZone: "UTC"
      },
      end: {
        dateTime: `${date}T11:00:00`,
        timeZone: "UTC"
      }
    };

    const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${providerToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to push to Google Calendar");
    }

    const result = await response.json();
    return NextResponse.json({
      success: true,
      message: `Task "${title}" added to your Google Calendar.`,
      eventId: result.id
    });
  } catch (error: unknown) {
    console.error("Calendar Sync Error:", error);
    return NextResponse.json({ error: (error as Error).message || "Failed to sync calendar" }, { status: 500 });
  }
}
