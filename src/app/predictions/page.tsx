import { redirect } from "next/navigation";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { Reveal } from "@/components/Reveal";
import { CountUp } from "@/components/insights/CountUp";
import { PredictionRow, type Prediction } from "@/components/predictions/PredictionRow";

export const revalidate = 0;
export const metadata = { title: "Prediction Ledger · GSIP" };

type Raw = {
  id: string;
  statement: string;
  rationale: string | null;
  probability: number;
  horizon_date: string | null;
  status: Prediction["status"];
  outcome: boolean | null;
  brier_score: number | null;
  resolved_by: string | null;
  event_id: string | null;
  created_at: string;
  events: { title: string } | { title: string }[] | null;
  domains: { name: string } | { name: string }[] | null;
};

type Calib = {
  domain_name: string | null;
  domain_code: string | null;
  resolved_count: number;
  pending_count: number;
  mean_brier: number | null;
  directional_accuracy: number | null;
};

function one<T>(x: T | T[] | null): T | null {
  return (Array.isArray(x) ? x[0] : x) ?? null;
}

export default async function PredictionsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/predictions");
  const canResolve = user.role === "analyst" || user.role === "admin";

  const supabase = await createClient();
  const [{ data: rawData }, { data: calibData }] = await Promise.all([
    supabase
      .from("predictions")
      .select(
        "id,statement,rationale,probability,horizon_date,status,outcome,brier_score,resolved_by,event_id,created_at,events(title),domains(name)"
      )
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<Raw[]>(),
    supabase.from("prediction_calibration").select("*").returns<Calib[]>(),
  ]);

  const preds: Prediction[] = (rawData ?? []).map((r) => ({
    id: r.id,
    statement: r.statement,
    rationale: r.rationale,
    probability: r.probability,
    horizon_date: r.horizon_date,
    status: r.status,
    outcome: r.outcome,
    brier_score: r.brier_score,
    resolved_by: r.resolved_by,
    event_id: r.event_id,
    event_title: one(r.events)?.title ?? null,
    domain_name: one(r.domains)?.name ?? null,
  }));

  const pending = preds.filter((p) => p.status === "pending");
  const resolved = preds.filter((p) => p.status === "resolved");
  const resolvedBriers = resolved.map((p) => p.brier_score).filter((b): b is number => b != null);
  const meanBrier = resolvedBriers.length
    ? resolvedBriers.reduce((a, b) => a + b, 0) / resolvedBriers.length
    : null;
  const hits = resolved.filter((p) => p.probability >= 0.5 === !!p.outcome).length;
  const accuracy = resolved.length ? hits / resolved.length : null;

  const calib = (calibData ?? [])
    .filter((c) => c.resolved_count > 0 || c.pending_count > 0)
    .sort((a, b) => (a.mean_brier ?? 1) - (b.mean_brier ?? 1));

  return (
    <div>
      <PageHeader
        layer="Foresight · Calibration"
        icon="target"
        title="Prediction Ledger"
        subtitle="Setiap prediksi dicatat dengan probabilitas & horizon, lalu di-resolve benar/salah. Platform mengukur akurasinya sendiri lewat Brier score — makin rendah makin baik (0 = sempurna, 0.25 = tebak koin)."
      />

      <div className="p-8 space-y-8">
        {/* headline calibration */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Prediksi aktif" value={<CountUp value={pending.length} />} icon="hourglass" />
          <Stat label="Telah di-resolve" value={<CountUp value={resolved.length} />} icon="check-check" />
          <Stat
            label="Mean Brier score"
            value={meanBrier == null ? "—" : <CountUp value={meanBrier} decimals={3} />}
            icon="gauge"
            tone={meanBrier == null ? "" : meanBrier <= 0.25 ? "text-emerald-600" : "text-amber-600"}
          />
          <Stat
            label="Akurasi arah"
            value={accuracy == null ? "—" : <CountUp value={accuracy * 100} decimals={0} suffix="%" />}
            icon="crosshair"
            tone={accuracy == null ? "" : accuracy >= 0.6 ? "text-emerald-600" : "text-amber-600"}
          />
        </div>

        {/* per-domain calibration leaderboard */}
        {calib.length > 0 && (
          <Reveal>
            <div className="card p-7">
              <span className="eyebrow">
                <Icon name="award" size={12} className="text-emerald-600" /> Kalibrasi per Domain
              </span>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--muted)]">
                      <th className="py-2 pr-4 font-medium">Domain</th>
                      <th className="py-2 px-4 font-medium text-right">Resolved</th>
                      <th className="py-2 px-4 font-medium text-right">Pending</th>
                      <th className="py-2 px-4 font-medium text-right">Mean Brier</th>
                      <th className="py-2 pl-4 font-medium text-right">Akurasi arah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calib.map((c, i) => (
                      <tr key={i} className="border-t border-[var(--hairline-soft)]">
                        <td className="py-2.5 pr-4">{c.domain_name ?? c.domain_code ?? "—"}</td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums">{c.resolved_count}</td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[var(--muted)]">{c.pending_count}</td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                          {c.mean_brier == null ? "—" : c.mean_brier.toFixed(3)}
                        </td>
                        <td className="py-2.5 pl-4 text-right font-mono tabular-nums">
                          {c.directional_accuracy == null ? "—" : `${Math.round(c.directional_accuracy * 100)}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Reveal>
        )}

        {/* active predictions */}
        <section>
          <h2 className="text-sm font-mono uppercase tracking-[0.18em] text-[var(--muted)] mb-3">
            Prediksi Aktif ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Belum ada prediksi aktif — pipeline ingesti menghasilkannya otomatis dari event baru.
            </p>
          ) : (
            <div className="grid gap-3">
              {pending.map((p) => (
                <PredictionRow key={p.id} p={p} canResolve={canResolve} />
              ))}
            </div>
          )}
        </section>

        {/* resolved history */}
        {resolved.length > 0 && (
          <section>
            <h2 className="text-sm font-mono uppercase tracking-[0.18em] text-[var(--muted)] mb-3">
              Riwayat Resolusi ({resolved.length})
            </h2>
            <div className="grid gap-3">
              {resolved.map((p) => (
                <PredictionRow key={p.id} p={p} canResolve={false} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  tone = "",
}: {
  label: string;
  value: React.ReactNode;
  icon: string;
  tone?: string;
}) {
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
