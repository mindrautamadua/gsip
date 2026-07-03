import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { SubstitutionBoard, type SubRow } from "@/components/substitution/SubstitutionBoard";

export const revalidate = 0;
export const metadata = { title: "Substitution & Beneficiaries · GSIP" };

export default async function SubstitutionPage() {
  const { data } = await supabase
    .from("substitution_chains")
    .select("shock_label,shock_kind,shock_icon,shock_note,beneficiary_code,beneficiary_name,rationale,readiness,magnitude,source,shock_order,sort_order")
    .order("shock_order")
    .order("sort_order")
    .returns<SubRow[]>();

  const rows = data ?? [];
  const shocks = new Set(rows.map((r) => r.shock_label)).size;
  const beneficiaries = new Set(rows.map((r) => r.beneficiary_code ?? r.beneficiary_name)).size;

  return (
    <div>
      <PageHeader
        layer="Geoekonomi · Efek Orde-Kedua"
        icon="split"
        title="Substitusi & Penerima Manfaat"
        subtitle="Setiap guncangan menciptakan pemenang. Saat ikatan atau dominasi melemah, nilai yang terlepas ditangkap pihak lain. Lensa ini memetakan efek orde-kedua: 'jika X terganggu, siapa yang diuntungkan — dan seberapa siap mereka menyerapnya'."
      />

      <div className="px-6 md:px-10 pb-24 space-y-8 max-w-6xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Guncangan dipetakan" value={shocks} icon="zap" tone="text-rose-600" />
          <Stat label="Negara beneficiary" value={beneficiaries} icon="trophy" tone="text-emerald-600" />
          <Stat label="Rantai substitusi" value={rows.length} icon="split" />
          <Stat label="Tingkat kesiapan" value={3} icon="gauge" hint="siap · sebagian · terbatas" />
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Belum ada rantai substitusi.</p>
        ) : (
          <SubstitutionBoard rows={rows} />
        )}

        <p className="text-[11px] font-mono text-[var(--muted)]/70">
          Basis: pemenang & relokasi rantai pasok dari MGI &ldquo;China and the World&rdquo; (2019) + OECD; baris bertanda adalah estimasi analis GSIP. Kesiapan menyerap bersifat indikatif.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, icon, tone = "", hint }: { label: string; value: number; icon: string; tone?: string; hint?: string }) {
  return (
    <div className="card p-5 flex items-center gap-3">
      <span className="h-10 w-10 shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20 grid place-items-center text-emerald-600">
        <Icon name={icon} size={18} />
      </span>
      <div className="min-w-0">
        <div className={`display text-2xl font-semibold tabular-nums ${tone}`}>{value}</div>
        <div className="text-[11px] text-[var(--muted)] truncate">{label}{hint ? ` · ${hint}` : ""}</div>
      </div>
    </div>
  );
}
