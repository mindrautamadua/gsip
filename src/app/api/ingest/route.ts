// POST/GET /api/ingest — trigger the ingestion pipeline.
// Auth: Authorization: Bearer <GSIP_INGEST_TOKEN> or ?token=<GSIP_INGEST_TOKEN>.

import { NextRequest, NextResponse } from "next/server";
import { runIngest } from "@/lib/ingest/pipeline";

export const maxDuration = 300;

function authorized(req: NextRequest): boolean {
  const expected = process.env.GSIP_INGEST_TOKEN;
  if (!expected) return false;
  const header = req.headers.get("authorization");
  if (header === `Bearer ${expected}`) return true;
  return req.nextUrl.searchParams.get("token") === expected;
}

async function handle(req: NextRequest): Promise<NextResponse> {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const max = req.nextUrl.searchParams.get("max");
  try {
    const report = await runIngest(max ? { maxItems: Number(max) } : undefined);
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  return handle(req);
}

export async function GET(req: NextRequest) {
  return handle(req);
}
