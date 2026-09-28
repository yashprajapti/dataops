import { NextResponse } from "next/server";
import { AGENT_MAP, type AgentId } from "@/lib/agents";

export const runtime = "edge";

interface Body {
  agent: AgentId;
  messages: { role: "user" | "assistant"; content: string }[];
  context?: string;
  apiKey?: string;
}

/**
 * POST /api/chat
 * Sends the conversation + dataset profile to Google Gemini.
 * If no key is configured, responds { fallback: true } and the client
 * uses the built-in local analysis engine instead.
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const agent = AGENT_MAP[body.agent];
  if (!agent) return NextResponse.json({ error: "Unknown agent" }, { status: 400 });

  const key = (body.apiKey || process.env.GEMINI_API_KEY || "").trim();
  if (!key) return NextResponse.json({ fallback: true, reason: "no-key" });

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const system = `${agent.system}

You are part of DataOps, an AI data analyst platform with five agents (Cleaner, SQL, Viz, Marketing Analytics, Advisor). Answer only as the ${agent.name}. Use Indian number formatting (lakh/crore, ₹) when talking about money. Keep answers under 350 words unless asked for more.

${body.context ? `DATASET CONTEXT:\n${body.context}` : "No dataset is loaded yet. Ask the user to upload a CSV or load a sample dataset from the Datasets page."}`;

  const contents = body.messages.slice(-12).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content.slice(0, 6000) }],
  }));

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents,
          generationConfig: { temperature: 0.4, maxOutputTokens: 1400 },
        }),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ fallback: true, reason: `gemini-${res.status}`, detail: err.slice(0, 300) });
    }
    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
    if (!text) return NextResponse.json({ fallback: true, reason: "empty" });
    return NextResponse.json({ text, tokens: data?.usageMetadata?.totalTokenCount ?? 0, model });
  } catch (e: any) {
    return NextResponse.json({ fallback: true, reason: "network", detail: String(e?.message || e) });
  }
}
