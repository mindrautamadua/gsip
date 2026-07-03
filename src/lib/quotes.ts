// Server-only stock quote fetcher.
// Uses Twelve Data when TWELVE_DATA_API_KEY is set (better intl coverage),
// otherwise falls back to Yahoo Finance's keyless chart endpoint.
// All failures degrade gracefully to "no quote".

export type Quote = {
  price: number;
  changePct: number | null;
  currency: string | null;
  source: "twelvedata" | "yahoo";
};

const TD_KEY = process.env.TWELVE_DATA_API_KEY;
const TTL = 300; // seconds — cached via Next fetch cache

async function yahoo(symbol: string): Promise<Quote | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?range=1d&interval=1d`;
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (GSIP)" },
      next: { revalidate: TTL },
    });
    if (!r.ok) return null;
    const j = await r.json();
    const m = j?.chart?.result?.[0]?.meta;
    const price = m?.regularMarketPrice;
    if (typeof price !== "number") return null;
    const prev = m?.chartPreviousClose ?? m?.previousClose;
    const changePct = typeof prev === "number" && prev ? ((price - prev) / prev) * 100 : null;
    return { price, changePct, currency: m?.currency ?? null, source: "yahoo" };
  } catch {
    return null;
  }
}

async function twelve(symbols: string[]): Promise<Record<string, Quote>> {
  const out: Record<string, Quote> = {};
  try {
    const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(
      symbols.join(",")
    )}&apikey=${TD_KEY}`;
    const r = await fetch(url, { next: { revalidate: TTL } });
    if (!r.ok) return out;
    const j = await r.json();
    const rows: Record<string, Record<string, unknown>> =
      symbols.length === 1 ? { [symbols[0]]: j } : j;
    for (const s of symbols) {
      const q = rows?.[s];
      const close = q?.close != null ? Number(q.close) : NaN;
      if (q && !Number.isNaN(close)) {
        out[s] = {
          price: close,
          changePct: q.percent_change != null ? Number(q.percent_change) : null,
          currency: (q.currency as string) ?? null,
          source: "twelvedata",
        };
      }
    }
  } catch {
    /* ignore */
  }
  return out;
}

async function yahooMany(symbols: string[]): Promise<Record<string, Quote>> {
  // bounded concurrency so we don't hammer the endpoint
  const out: Record<string, Quote> = {};
  const CHUNK = 6;
  for (let i = 0; i < symbols.length; i += CHUNK) {
    const part = symbols.slice(i, i + CHUNK);
    const res = await Promise.all(part.map((s) => yahoo(s)));
    part.forEach((s, idx) => {
      const q = res[idx];
      if (q) out[s] = q;
    });
  }
  return out;
}

export async function getQuotes(symbols: (string | null | undefined)[]): Promise<Record<string, Quote>> {
  const uniq = [...new Set(symbols.filter((s): s is string => !!s))];
  if (uniq.length === 0) return {};

  if (TD_KEY) {
    const out = await twelve(uniq);
    // Twelve Data free tier misses some exchanges (e.g. .JK) — fill gaps via Yahoo.
    const missing = uniq.filter((s) => !out[s]);
    if (missing.length) Object.assign(out, await yahooMany(missing));
    return out;
  }

  return yahooMany(uniq);
}

export type HistPoint = { t: number; c: number };
export type Range = "1mo" | "6mo" | "1y";
const TD_OUTSIZE: Record<Range, number> = { "1mo": 23, "6mo": 130, "1y": 260 };

// Daily closes over the requested range for a sparkline/area chart.
export async function getHistory(symbol: string, range: Range = "6mo"): Promise<HistPoint[]> {
  if (!symbol) return [];
  if (TD_KEY) {
    try {
      const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(
        symbol
      )}&interval=1day&outputsize=${TD_OUTSIZE[range]}&apikey=${TD_KEY}`;
      const r = await fetch(url, { next: { revalidate: 3600 } });
      const j = await r.json();
      const values: { datetime: string; close: string }[] = j?.values ?? [];
      const pts = values
        .map((v) => ({ t: new Date(v.datetime).getTime(), c: Number(v.close) }))
        .filter((p) => !Number.isNaN(p.c))
        .reverse();
      if (pts.length) return pts;
      // fall through to Yahoo if TD returned nothing (coverage gaps)
    } catch {
      /* fall through */
    }
  }
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?range=${range}&interval=1d`;
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (GSIP)" },
      next: { revalidate: 3600 },
    });
    if (!r.ok) return [];
    const j = await r.json();
    const res = j?.chart?.result?.[0];
    const ts: number[] = res?.timestamp ?? [];
    const cl: (number | null)[] = res?.indicators?.quote?.[0]?.close ?? [];
    const out: HistPoint[] = [];
    for (let i = 0; i < ts.length; i++) {
      const c = cl[i];
      if (typeof c === "number") out.push({ t: ts[i] * 1000, c });
    }
    return out;
  } catch {
    return [];
  }
}

export function formatPrice(q: Quote): string {
  const n = q.price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (q.currency === "USD") return `$${n}`;
  return q.currency ? `${n} ${q.currency}` : n;
}
