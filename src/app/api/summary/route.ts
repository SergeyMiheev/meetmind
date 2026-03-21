import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { geminiFlash, SUMMARY_PROMPT } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.userEmail) {
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

  const result = await geminiFlash.generateContent([
    { text: SUMMARY_PROMPT },
    { text: userMessage },
  ]);

  const responseText = result.response.text();

  // Parse JSON from response (strip markdown fences if any)
  const jsonStr = responseText.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(jsonStr);

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.userEmail },
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
          modelUsed: "gemini-2.0-flash",
        },
        update: {
          rawInput,
          summaryContext: parsed.context,
          summaryMainIdeas: parsed.mainIdeas || [],
          summaryActions: parsed.actionItems || [],
          tags: parsed.tags || [],
          modelUsed: "gemini-2.0-flash",
          updatedAt: new Date(),
        },
      });
      return NextResponse.json(summary);
    }
  } catch (err) {
    console.error("[summary] DB error:", err);
  }

  // Return AI result even if DB save fails
  return NextResponse.json({
    calendarEventId: eventId,
    eventTitle,
    summaryContext: parsed.context,
    summaryMainIdeas: parsed.mainIdeas || [],
    summaryActions: parsed.actionItems || [],
    tags: parsed.tags || [],
    modelUsed: "gemini-2.0-flash",
  });
}
