import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.userEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.userEmail },
    });

    if (!user) {
      return NextResponse.json([]);
    }

    const summaries = await prisma.summary.findMany({
      where: { userId: user.id },
      orderBy: { eventStart: "desc" },
    });

    return NextResponse.json(summaries);
  } catch (err) {
    console.error("[summaries] DB error:", err);
    return NextResponse.json([]);
  }
}
