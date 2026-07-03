// Best-effort live market cap (USD billions). Sources are flaky on free tiers,
// so every path degrades gracefully to "no value" and the caller keeps the snapshot.

const TD_KEY = process.env.TWELVE_DATA_API_KEY;

async function twelve(symbol: string): Promise<number | null> {
  if (!TD_KEY) return null;
  try {
    const r = await fetch(
      `https://api.twelvedata.com/statistics?symbol=${encodeURIComponent(symbol)}&apikey=${TD_KEY}`,
      { cache: "no-store" }
    );
    const j = await r.json();
    const mc = j?.statistics?.valuations_metrics?.market_capitalization;
    return mc ? Number(mc) / 1e9 : null;
  } catch {
    return null;
  }
}

async function yahoo(symbol: string): Promise<number | null> {
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=price`,
      { headers: { "User-Agent": "Mozilla/5.0 (GSIP)" }, cache: "no-store" }
    );
    if (!r.ok) return null;
    const j = await r.json();
    const mc = j?.quoteSummary?.result?.[0]?.price?.marketCap?.raw;
    return mc ? Number(mc) / 1e9 : null;
  } catch {
    return null;
  }
}

// symbols -> { symbol: marketCapUsdBn } (only successful lookups included)
export async function getMarketCaps(symbols: string[]): Promise<Record<string, number>> {
  const uniq = [...new Set(symbols.filter(Boolean))];
  const out: Record<string, number> = {};
  const CHUNK = 4;
  for (let i = 0; i < uniq.length; i += CHUNK) {
    const part = uniq.slice(i, i + CHUNK);
    const res = await Promise.all(
      part.map(async (s) => (await twelve(s)) ?? (await yahoo(s)))
    );
    part.forEach((s, idx) => {
      const v = res[idx];
      if (v && v > 0) out[s] = Math.round(v);
    });
  }
  return out;
}
