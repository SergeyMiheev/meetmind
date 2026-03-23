import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { geminiFlash, SUMMARY_PROMPT } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      eventId,
      eventTitle,
      eventStart,
      eventEnd,
      eventAttendees,
      eventDescription,
      rawInput,
    } = body;

    if (!eventId || !rawInput?.trim()) {
      return NextResponse.json(
        { error: "eventId and rawInput required" },
        { status: 400 }
      );
    }

    // Build context for AI
    const calendarContext = [
      `Meeting: ${eventTitle}`,
      eventDescription ? `Description: ${eventDescription}` : "",
      eventAttendees?.length
        ? `Attendees: ${eventAttendees.map((a: { displayName?: string; email: string }) => a.displayName || a.email).join(", ")}`
        : "",
      `Time: ${eventStart} - ${eventEnd}`,
    ]
      .filter(Boolean)
      .join("\n");

    const userMessage = `Calendar context:\n${calendarContext}\n\nUser's notes:\n${rawInput}`;

    let parsed;
    try {
      const result = await geminiFlash.generateContent([
        { text: SUMMARY_PROMPT },
        { text: userMessage },
      ]);

      const responseText = result.response.text();
      const jsonStr = responseText.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch (aiErr) {
      console.error("[summary] Gemini API error:", aiErr);
      return NextResponse.json(
        { error: "AI summarization failed", details: String(aiErr) },
        { status: 502 }
      );
    }

    const userEmail = session.user.email || (session as unknown as Record<string, unknown>).userEmail as string;

    try {
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
      });

      if (user) {
        const summary = await prisma.summary.upsert({
          where: {
            userId_calendarEventId: {
              userId: user.id,
              calendarEventId: eventId,
            },
          },
          create: {
            userId: user.id,
            calendarEventId: eventId,
            eventTitle: eventTitle || "(No title)",
            eventStart: new Date(eventStart),
            eventEnd: new Date(eventEnd),
            eventAttendees: eventAttendees || [],
            rawInput,
            summaryContext: parsed.context,
            summaryMainIdeas: parsed.mainIdeas || [],
            summaryActions: parsed.actionItems || [],
            tags: parsed.tags || [],
            modelUsed: "gemini-2.5-flash",
          },
          update: {
            rawInput,
            summaryContext: parsed.context,
            summaryMainIdeas: parsed.mainIdeas || [],
            summaryActions: parsed.actionItems || [],
            tags: parsed.tags || [],
            modelUsed: "gemini-2.5-flash",
            updatedAt: new Date(),
          },
        });
        return NextResponse.json(summary);
      } else {
        console.error("[summary] User not found in DB for email:", userEmail);
      }
    } catch (dbErr) {
      console.error("[summary] DB error:", dbErr);
    }

    // Return AI result even if DB save fails — include all fields frontend expects
    return NextResponse.json({
      id: `temp-${Date.now()}`,
      calendarEventId: eventId,
      eventTitle: eventTitle || "(No title)",
      eventStart: eventStart,
      eventEnd: eventEnd,
      eventAttendees: eventAttendees || [],
      rawInput,
      summaryContext: parsed.context,
      summaryMainIdeas: parsed.mainIdeas || [],
      summaryActions: parsed.actionItems || [],
      tags: parsed.tags || [],
      modelUsed: "gemini-2.5-flash",
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[summary] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}
