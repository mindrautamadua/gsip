import { NextResponse } from "next/server";
import { getQuotes } from "@/lib/quotes";

// GET /api/quotes?symbols=AAPL,BBRI.JK  -> { quotes: { SYM: {price, changePct, currency, source} } }
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbols = (searchParams.get("symbols") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);

  if (symbols.length === 0) {
    return NextResponse.json({ error: "provide ?symbols=A,B,C" }, { status: 400 });
  }

  const quotes = await getQuotes(symbols);
  return NextResponse.json(
    { quotes },
    { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } }
  );
}
