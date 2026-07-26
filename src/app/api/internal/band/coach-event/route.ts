import { NextRequest, NextResponse } from "next/server";
import { verifyBandWorkerSignature } from "@/lib/band-security";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!verifyBandWorkerSignature(rawBody, req.headers.get("X-TinyWins-Signature"))) {
    return NextResponse.json({ error: "unauthorized worker callback" }, { status: 401 });
  }
  // The coach worker callback is currently observability-only. Goal events are
  // persisted synchronously by the web routes that create them.
  return NextResponse.json({ ok: true });
}
