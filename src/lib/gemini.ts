import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const geminiFlash = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

export const SUMMARY_PROMPT = `You are a meeting summary assistant. Given the user's raw notes/thoughts about a meeting and the calendar context, create a structured summary.

Output ONLY valid JSON with this exact structure:
{
  "context": "A brief paragraph about what this meeting was about",
  "mainIdeas": ["idea 1", "idea 2", ...],
  "actionItems": ["action 1", "action 2", ...],
  "tags": ["tag1", "tag2"]
}

Rules for tags:
- Generate 2-3 short, lowercase, hyphenated tags
- First tag = meeting type (e.g. interview, standup, 1:1, client-call, retro, brainstorm)
- Second tag = key topic or project name
- Optional third tag = extracted from meeting title if meaningful

Rules for action items:
- Start with @person if assignee is mentioned
- Be specific and actionable
- Include deadlines if mentioned

Do NOT include any markdown, code fences, or explanation. Return ONLY the JSON object.`;
