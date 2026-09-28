import { NextResponse } from "next/server";
export const runtime = "edge";
export async function GET() {
  return NextResponse.json({ ok: true, ai: process.env.GEMINI_API_KEY ? "gemini" : "local", time: new Date().toISOString() });
}
