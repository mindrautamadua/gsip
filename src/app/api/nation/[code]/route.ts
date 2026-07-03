import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionUser } from "@/lib/supabase/server";

const YEAR = 2023;

// Full NEF index breakdown for one country: 3 axes → 18 pillars → indicators.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { code } = await params;

  const [country, scores, dims, pillars, pillarScores, indicators, values] = await Promise.all([
    supabase.from("nef_countries").select("code,iso2,name,region,income_group").eq("code", code).maybeSingle()
      .returns<{ code: string; iso2: string | null; name: string; region: string | null; income_group: string | null }>(),
    supabase.from("nef_country_scores").select("status_score,capability_score,future_score,composite_score").eq("country_code", code).eq("year", YEAR).maybeSingle()
      .returns<{ status_score: number | null; capability_score: number | null; future_score: number | null; composite_score: number | null }>(),
    supabase.from("nef_meta_dimensions").select("id,code,label,description,sort_order").order("sort_order")
      .returns<{ id: string; code: string; label: string; description: string | null; sort_order: number }[]>(),
    supabase.from("nef_pillars").select("id,meta_dimension_id,name,description,weight,sort_order").order("sort_order")
      .returns<{ id: string; meta_dimension_id: string; name: string; description: string | null; weight: number; sort_order: number }[]>(),
    supabase.from("nef_country_pillar_scores").select("pillar_id,score").eq("country_code", code).eq("year", YEAR)
      .returns<{ pillar_id: string; score: number | null }[]>(),
    supabase.from("nef_indicators").select("id,pillar_id,name,source_org,unit,direction,sort_order").order("sort_order")
      .returns<{ id: string; pillar_id: string; name: string; source_org: string | null; unit: string | null; direction: string; sort_order: number }[]>(),
    supabase.from("nef_country_indicator_values").select("indicator_id,raw_value,normalized_value").eq("country_code", code).eq("year", YEAR)
      .returns<{ indicator_id: string; raw_value: number | null; normalized_value: number | null }[]>(),
  ]);

  if (!country.data) return NextResponse.json({ error: "not found" }, { status: 404 });

  const sc = scores.data;
  const pScore = new Map((pillarScores.data ?? []).map((r) => [r.pillar_id, r.score]));
  const iVal = new Map((values.data ?? []).map((r) => [r.indicator_id, r]));
  const indByPillar = new Map<string, typeof indicators.data>();
  for (const ind of indicators.data ?? []) {
    if (!indByPillar.has(ind.pillar_id)) indByPillar.set(ind.pillar_id, []);
    indByPillar.get(ind.pillar_id)!.push(ind);
  }

  const axisScore = (dimCode: string): number | null => {
    if (dimCode.startsWith("status")) return sc?.status_score ?? null;
    if (dimCode.startsWith("cap")) return sc?.capability_score ?? null;
    if (dimCode.startsWith("fut")) return sc?.future_score ?? null;
    return null;
  };

  const dimensions = (dims.data ?? []).map((d) => ({
    code: d.code,
    label: d.label,
    description: d.description,
    score: axisScore(d.code),
    pillars: (pillars.data ?? [])
      .filter((p) => p.meta_dimension_id === d.id)
      .map((p) => ({
        name: p.name,
        description: p.description,
        weight: Number(p.weight),
        score: pScore.get(p.id) ?? null,
        indicators: (indByPillar.get(p.id) ?? [])
          .map((ind) => {
            const v = iVal.get(ind.id);
            return v && v.normalized_value != null
              ? {
                  name: ind.name,
                  source: ind.source_org,
                  unit: ind.unit,
                  direction: ind.direction,
                  normalized: Number(v.normalized_value),
                  raw: v.raw_value != null ? Number(v.raw_value) : null,
                }
              : null;
          })
          .filter(Boolean),
      })),
  }));

  return NextResponse.json({
    code: country.data.code,
    name: country.data.name,
    iso2: country.data.iso2,
    region: country.data.region,
    income_group: country.data.income_group,
    composite: sc?.composite_score != null ? Number(sc.composite_score) : null,
    dimensions,
  });
}
