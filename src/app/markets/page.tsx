import { PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { Reveal } from "@/components/Reveal";
import { Sparkline } from "@/components/market/Sparkline";
import { fetchMarket } from "@/lib/market/twelvedata";

// Cache 5 min — conserves TwelveData quota while keeping data fresh.
export const revalidate = 300;
export const metadata = { title: "Market Signals · GSIP" };

function fmtPrice(p: number | null): string {
  if (p == null) return "—";
  if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (p >= 1) return p.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return p.toFixed(4);
}

export default async function MarketsPage() {
  const { quotes, error } = await fetchMarket();
  const live = quotes.filter((q) => q.price != null);
  const gainers = live.filter((q) => (q.changePct ?? 0) > 0).length;
  const losers = live.filter((q) => (q.changePct ?? 0) < 0).length;

  return (
    <div>
      <PageHeader
        layer="Pasar · Dasar Kuantitatif"
        icon="candlestick-chart"
        title="Sinyal Pasar"
        subtitle="Instrumen strategis yang mengkuantifikasi narasi intelijen — rupiah, yuan, emas, dan sektor semikonduktor. Data via TwelveData, di-cache 5 menit."
      />

      <div className="p-8 space-y-6">
        {error && (
          <div className="card p-4 border-rose-500/30 text-sm text-rose-700 flex items-center gap-2">
            <Icon name="alert-triangle" size={16} /> Gagal memuat data pasar: {error}
          </div>
        )}

        {live.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <Stat label="Instrumen live" value={live.length} icon="activity" />
            <Stat label="Menguat" value={gainers} icon="trending-up" tone="text-emerald-600" />
            <Stat label="Melemah" value={losers} icon="trending-down" tone="text-rose-600" />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quotes.map((q, i) => {
            const up = (q.changePct ?? 0) >= 0;
            return (
              <Reveal key={q.symbol} delay={i * 70}>
                <div className="card p-5 h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{q.label}</div>
                      <div className="text-[11px] font-mono text-[var(--muted)]">{q.symbol}</div>
                    </div>
                    <span className="eyebrow shrink-0">{q.theme}</span>
                  </div>

                  <div className="flex items-end justify-between gap-3 mt-4">
                    <div>
                      <div className="display text-2xl font-semibold tabular-nums tracking-tight">
                        {fmtPrice(q.price)}
                        {q.currency && q.price != null && (
                          <span className="text-xs text-[var(--muted)] font-sans font-normal ml-1">{q.currency}</span>
                        )}
                      </div>
                      {q.changePct != null && (
                        <div className={`text-sm font-mono mt-0.5 inline-flex items-center gap-1 ${up ? "text-emerald-600" : "text-rose-600"}`}>
                          <Icon name={up ? "arrow-up-right" : "arrow-down-right"} size={13} />
                          {up ? "+" : ""}{q.changePct.toFixed(2)}%
                        </div>
                      )}
                    </div>
                    <Sparkline data={q.series} up={up} />
                  </div>

                  <p className="text-xs text-[var(--muted)] mt-4 leading-relaxed border-t border-[var(--hairline-soft)] pt-3">
                    {q.note}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>

        <p className="text-[11px] font-mono text-[var(--muted)]">
          Sumber: TwelveData · sparkline = 20 hari perdagangan terakhir · harga dapat tertunda sesuai kebijakan penyedia.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, icon, tone = "" }: { label: string; value: number; icon: string; tone?: string }) {
  return (
    <div className="card p-5 flex items-center gap-3">
      <span className="h-10 w-10 shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20 grid place-items-center text-emerald-600">
        <Icon name={icon} size={18} />
      </span>
      <div>
        <div className={`display text-2xl font-semibold tabular-nums ${tone}`}>{value}</div>
        <div className="text-[11px] text-[var(--muted)]">{label}</div>
      </div>
    </div>
  );
}
