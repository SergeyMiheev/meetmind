import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summaries = await prisma.summary.findMany({
    where: { userId: session.userId },
    orderBy: { eventStart: "desc" },
  });

  return NextResponse.json(summaries);
}
