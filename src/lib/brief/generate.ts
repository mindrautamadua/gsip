// Intelligence Brief generator — synthesizes an executive summary from recent
// events + L4 analyses via GPT-4o-mini structured output. Server-only.

import { supabase } from "@/lib/supabase";

export type BriefSections = {
  top_signals: { title: string; event_id: string | null; so_what: string }[];
  domain_shifts: { domain: string; direction: "naik" | "turun" | "stabil"; note: string }[];
  recommendations: string[];
  outlook: string;
};

export type GeneratedBrief = {
  period: "daily" | "weekly";
  period_start: string;
  period_end: string;
  title: string;
  executive_summary: string;
  sections: BriefSections;
  event_count: number;
  model: string;
};

type EventDigest = {
  id: string;
  title: string;
  domain: string | null;
  importance: number | null;
  impact_score: number | null;
  risk_score: number | null;
  opportunity_score: number | null;
  impact: string | null;
  recommendation: string | null;
};

const SCHEMA = {
  name: "gsip_brief",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["title", "executive_summary", "top_signals", "domain_shifts", "recommendations", "outlook"],
    properties: {
      title: { type: "string" },
      executive_summary: { type: "string", description: "2-4 kalimat ringkasan eksekutif" },
      top_signals: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "event_id", "so_what"],
          properties: {
            title: { type: "string" },
            event_id: { type: ["string", "null"], description: "id event sumber dari daftar" },
            so_what: { type: "string", description: "implikasi strategis singkat" },
          },
        },
      },
      domain_shifts: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["domain", "direction", "note"],
          properties: {
            domain: { type: "string" },
            direction: { type: "string", enum: ["naik", "turun", "stabil"] },
            note: { type: "string" },
          },
        },
      },
      recommendations: { type: "array", items: { type: "string" } },
      outlook: { type: "string", description: "outlook 1-2 kalimat untuk periode berikutnya" },
    },
  },
} as const;

const SYSTEM = `Anda adalah kepala analis GSIP yang menyusun Intelligence Brief eksekutif untuk
pimpinan korporasi/BUMN Indonesia. Dari daftar peristiwa strategis terbaru beserta skornya,
sintesiskan brief yang tajam, ringkas, dan dapat ditindaklanjuti — BUKAN sekadar daftar ulang.

Aturan:
- Semua output dalam BAHASA INDONESIA, gaya eksekutif (padat, tegas, tanpa jargon berlebihan).
- top_signals: pilih 3-5 peristiwa PALING penting; event_id wajib dari daftar. so_what = implikasi.
- domain_shifts: identifikasi 2-4 domain dengan pergeseran nyata (naik/turun/stabil intensitasnya).
- recommendations: 3-5 rekomendasi agregat lintas-peristiwa untuk pengambil keputusan Indonesia.
- Sudut pandang: kepentingan strategis Indonesia.`;

async function loadDigest(sinceISO: string): Promise<EventDigest[]> {
  const { data } = await supabase
    .from("events")
    .select(
      "id,title,importance,created_at,domains(name),event_analyses(impact_score,risk_score,opportunity_score,impact,recommendation)"
    )
    .gte("created_at", sinceISO)
    .order("importance", { ascending: false })
    .limit(50);

  const rows = (data ?? []) as unknown as {
    id: string;
    title: string;
    importance: number | null;
    domains: { name: string } | { name: string }[] | null;
    event_analyses:
      | { impact_score: number | null; risk_score: number | null; opportunity_score: number | null; impact: string | null; recommendation: string | null }
      | { impact_score: number | null; risk_score: number | null; opportunity_score: number | null; impact: string | null; recommendation: string | null }[]
      | null;
  }[];

  const one = <T,>(x: T | T[] | null): T | null => (Array.isArray(x) ? x[0] : x) ?? null;

  return rows.map((r) => {
    const a = one(r.event_analyses);
    const d = one(r.domains);
    return {
      id: r.id,
      title: r.title,
      domain: d?.name ?? null,
      importance: r.importance,
      impact_score: a?.impact_score ?? null,
      risk_score: a?.risk_score ?? null,
      opportunity_score: a?.opportunity_score ?? null,
      impact: a?.impact ?? null,
      recommendation: a?.recommendation ?? null,
    };
  });
}

export async function generateBrief(period: "daily" | "weekly"): Promise<GeneratedBrief> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const days = period === "daily" ? 2 : 8;
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400_000);
  let digest = await loadDigest(start.toISOString());

  // Fallback: if the window is thin, take the most recent events regardless.
  if (digest.length < 3) digest = await loadDigest(new Date(end.getTime() - 90 * 86400_000).toISOString());
  if (digest.length === 0) throw new Error("Belum ada event untuk disintesis menjadi brief.");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: JSON.stringify({
            period,
            window: { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) },
            events: digest,
          }),
        },
      ],
      response_format: { type: "json_schema", json_schema: SCHEMA },
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI mengembalikan konten kosong");
  const parsed = JSON.parse(content) as {
    title: string;
    executive_summary: string;
  } & BriefSections;

  // keep only event_ids that exist in the digest
  const valid = new Set(digest.map((d) => d.id));
  parsed.top_signals = (parsed.top_signals ?? []).map((s) => ({
    ...s,
    event_id: s.event_id && valid.has(s.event_id) ? s.event_id : null,
  }));

  return {
    period,
    period_start: start.toISOString().slice(0, 10),
    period_end: end.toISOString().slice(0, 10),
    title: parsed.title,
    executive_summary: parsed.executive_summary,
    sections: {
      top_signals: parsed.top_signals,
      domain_shifts: parsed.domain_shifts ?? [],
      recommendations: parsed.recommendations ?? [],
      outlook: parsed.outlook ?? "",
    },
    event_count: digest.length,
    model,
  };
}
