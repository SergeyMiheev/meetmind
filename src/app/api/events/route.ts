import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { google } from "googleapis";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json(
      { error: "start and end required" },
      { status: 400 }
    );
  }

  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: session.accessToken });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: start,
      timeMax: end,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 100,
    });

    const events = (response.data.items || [])
      .filter((e) => e.start?.dateTime)
      .map((e) => ({
        id: e.id,
        summary: e.summary || "(No title)",
        start: e.start!.dateTime!,
        end: e.end!.dateTime!,
        attendees: (e.attendees || []).map((a) => ({
          email: a.email,
          displayName: a.displayName,
        })),
        description: e.description,
      }));

    return NextResponse.json(events);
  } catch (err: unknown) {
    const error = err as { code?: number; message?: string; errors?: unknown[] };
    console.error("[events] Google Calendar API error:", error.code, error.message, error.errors);
    return NextResponse.json(
      { error: "Failed to fetch calendar events", details: error.message, code: error.code },
      { status: error.code === 401 ? 401 : 502 }
    );
  }
}
