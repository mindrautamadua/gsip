import { NextResponse } from "next/server";
import { getHistory, type Range } from "@/lib/quotes";

const RANGES: Range[] = ["1mo", "6mo", "1y"];

// GET /api/history?symbol=AAPL&range=6mo -> { points: [{t,c}] }
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") ?? "").trim();
  const range = (searchParams.get("range") ?? "6mo") as Range;
  if (!symbol) return NextResponse.json({ error: "provide ?symbol=" }, { status: 400 });

  const points = await getHistory(symbol, RANGES.includes(range) ? range : "6mo");
  return NextResponse.json(
    { points },
    { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } }
  );
}
