import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const audioFile = formData.get("audio") as File | null;

  if (!audioFile) {
    return NextResponse.json({ error: "No audio file" }, { status: 400 });
  }

  // Check size (4.5MB limit for Vercel)
  if (audioFile.size > 4.5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Audio file too large (max 4.5MB)" },
      { status: 413 }
    );
  }

  const buffer = Buffer.from(await audioFile.arrayBuffer());
  const base64Audio = buffer.toString("base64");

  const mimeType = audioFile.type || "audio/webm";

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const result = await model.generateContent([
    {
      text: "Transcribe this audio recording accurately. Output ONLY the transcribed text, nothing else. If the audio is in a language other than English, transcribe it in the original language.",
    },
    {
      inlineData: {
        mimeType,
        data: base64Audio,
      },
    },
  ]);

  const text = result.response.text().trim();

  return NextResponse.json({ text });
}
