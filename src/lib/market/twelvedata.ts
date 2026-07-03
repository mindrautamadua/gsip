// TwelveData market feed — quantitative ground-truth for GSIP's strategic
// instruments. Batched calls (1 quote + 1 time_series for the whole watchlist)
// keep well within the free tier's rate limits.

export type Instrument = {
  symbol: string;
  label: string;
  theme: string;
  // narrative tie-in: why this matters for Indonesia/ASEAN strategy
  note: string;
};

// Verified-liquid symbols mapped to GSIP's commodity-geopolitics niche.
export const INSTRUMENTS: Instrument[] = [
  { symbol: "USD/IDR", label: "USD / IDR", theme: "Rupiah", note: "Jangkar makro Indonesia; tekanan impor & utang" },
  { symbol: "USD/CNY", label: "USD / CNY", theme: "Yuan", note: "Mitra dagang & investasi terbesar" },
  { symbol: "XAU/USD", label: "Emas", theme: "Safe haven", note: "Barometer risiko & inflasi global" },
  { symbol: "SOXX", label: "Semiconductor ETF", theme: "Chip", note: "Geopolitik semikonduktor AS–China" },
  { symbol: "SPY", label: "S&P 500", theme: "Risiko global", note: "Selera risiko pasar dunia" },
  { symbol: "QQQ", label: "Nasdaq 100", theme: "Teknologi", note: "Momentum sektor teknologi & AI" },
];

export type Quote = {
  symbol: string;
  label: string;
  theme: string;
  note: string;
  name: string | null;
  price: number | null;
  changePct: number | null;
  currency: string | null;
  series: number[]; // close values, oldest → newest (for sparkline)
};

const BASE = "https://api.twelvedata.com";

function key(): string {
  const k = process.env.TWELVE_DATA_API_KEY;
  if (!k) throw new Error("TWELVE_DATA_API_KEY is not set");
  return k;
}

// TwelveData returns a bare object for a single symbol and a keyed map for
// multiple — normalize both to a map.
function asMap(data: unknown, symbols: string[]): Record<string, unknown> {
  if (data && typeof data === "object" && "symbol" in (data as object) && symbols.length === 1) {
    return { [symbols[0]]: data };
  }
  return (data as Record<string, unknown>) ?? {};
}

async function getQuotes(symbols: string[]): Promise<Record<string, { name: string | null; price: number | null; changePct: number | null; currency: string | null }>> {
  const url = `${BASE}/quote?symbol=${encodeURIComponent(symbols.join(","))}&apikey=${key()}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`TwelveData quote HTTP ${res.status}`);
  const map = asMap(await res.json(), symbols);
  const out: Record<string, { name: string | null; price: number | null; changePct: number | null; currency: string | null }> = {};
  for (const s of symbols) {
    const q = map[s] as Record<string, unknown> | undefined;
    if (!q || q.code) continue;
    out[s] = {
      name: (q.name as string) ?? null,
      price: q.close != null ? Number(q.close) : null,
      changePct: q.percent_change != null ? Number(q.percent_change) : null,
      currency: (q.currency as string) ?? null,
    };
  }
  return out;
}

async function getSeries(symbols: string[]): Promise<Record<string, number[]>> {
  const url = `${BASE}/time_series?symbol=${encodeURIComponent(symbols.join(","))}&interval=1day&outputsize=20&apikey=${key()}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`TwelveData time_series HTTP ${res.status}`);
  const map = asMap(await res.json(), symbols);
  const out: Record<string, number[]> = {};
  for (const s of symbols) {
    const v = map[s] as Record<string, unknown> | undefined;
    const values = (v?.values as { close: string }[]) ?? [];
    // API returns newest → oldest; reverse for a left-to-right sparkline.
    out[s] = values.map((row) => Number(row.close)).reverse();
  }
  return out;
}

// Fetch the full watchlist. Never throws for partial failures — returns
// whatever resolved so the page degrades gracefully.
export async function fetchMarket(): Promise<{ quotes: Quote[]; error: string | null }> {
  const symbols = INSTRUMENTS.map((i) => i.symbol);
  try {
    const [quotes, series] = await Promise.all([getQuotes(symbols), getSeries(symbols)]);
    const rows: Quote[] = INSTRUMENTS.map((inst) => {
      const q = quotes[inst.symbol];
      return {
        symbol: inst.symbol,
        label: inst.label,
        theme: inst.theme,
        note: inst.note,
        name: q?.name ?? null,
        price: q?.price ?? null,
        changePct: q?.changePct ?? null,
        currency: q?.currency ?? null,
        series: series[inst.symbol] ?? [],
      };
    });
    return { quotes: rows, error: null };
  } catch (err) {
    return { quotes: [], error: err instanceof Error ? err.message : String(err) };
  }
}
