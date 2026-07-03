// LLM extraction: one news item → strategic relevance gate + L2/L3/L4 payload
// shaped for the gsip_ingest RPC. Uses OpenAI structured outputs so the
// response always matches the schema.

import type { FeedItem } from "./rss";

export type OntologyContext = {
  domains: { code: string; name: string }[];
  eventTypes: { code: string; label: string }[];
  entityTypes: { code: string; label: string; category: string | null }[];
  relationshipTypes: { code: string; label: string }[];
  gicsIndustries: { code: string; name: string }[];
  existingEntities: { slug: string; name: string }[];
  recentEvents: { id: string; title: string; event_date: string | null }[];
};

export type Extraction = {
  relevant: boolean;
  reason: string;
  event: {
    title: string;
    summary: string;
    description: string | null;
    event_date: string | null;
    event_type_code: string;
    domain_code: string;
    importance: number;
    confidence: number;
    source_reliability: "A" | "B" | "C" | "D" | "E" | "F";
    info_credibility: "1" | "2" | "3" | "4" | "5" | "6";
  } | null;
  entities: {
    name: string;
    slug: string;
    entity_type_code: string;
    domain_code: string | null;
    country_code: string | null;
    gics_industry_code: string | null;
    description: string | null;
    role: "initiated_by" | "impacts" | "involves" | "occurs_in" | "target_of";
  }[];
  entity_edges: { source_slug: string; target_slug: string; relationship_code: string }[];
  event_links: { event_id: string; relation: string; direction: "incoming" | "outgoing" }[];
  predictions: {
    statement: string;
    rationale: string;
    probability: number;
    horizon_days: number;
  }[];
  analysis: {
    what: string;
    who: string;
    when_text: string;
    where_text: string;
    why: string;
    how: string;
    impact: string;
    risk: string;
    opportunity: string;
    scenario: string;
    prediction: string;
    recommendation: string;
    impact_score: number;
    risk_score: number;
    opportunity_score: number;
    confidence_score: number;
  } | null;
};

const nullableStr = { type: ["string", "null"] };

const RESPONSE_SCHEMA = {
  name: "gsip_extraction",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["relevant", "reason", "event", "entities", "entity_edges", "event_links", "predictions", "analysis"],
    properties: {
      relevant: { type: "boolean" },
      reason: { type: "string" },
      event: {
        type: ["object", "null"],
        additionalProperties: false,
        required: [
          "title", "summary", "description", "event_date",
          "event_type_code", "domain_code", "importance", "confidence",
          "source_reliability", "info_credibility",
        ],
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          description: nullableStr,
          event_date: { ...nullableStr, description: "YYYY-MM-DD" },
          event_type_code: { type: "string" },
          domain_code: { type: "string" },
          importance: { type: "integer", minimum: 1, maximum: 5 },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          source_reliability: {
            type: "string",
            enum: ["A", "B", "C", "D", "E", "F"],
            description: "NATO Admiralty source reliability: A=reliable outlet/official, C=usually reliable news, E=unreliable, F=cannot judge",
          },
          info_credibility: {
            type: "string",
            enum: ["1", "2", "3", "4", "5", "6"],
            description: "NATO Admiralty info credibility: 1=confirmed by other sources, 3=possibly true, 5=improbable, 6=cannot judge",
          },
        },
      },
      entities: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "name", "slug", "entity_type_code", "domain_code",
            "country_code", "gics_industry_code", "description", "role",
          ],
          properties: {
            name: { type: "string" },
            slug: { type: "string" },
            entity_type_code: { type: "string" },
            domain_code: nullableStr,
            country_code: { ...nullableStr, description: "ISO 3166-1 alpha-2" },
            gics_industry_code: nullableStr,
            description: nullableStr,
            role: { type: "string", enum: ["initiated_by", "impacts", "involves", "occurs_in", "target_of"] },
          },
        },
      },
      entity_edges: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["source_slug", "target_slug", "relationship_code"],
          properties: {
            source_slug: { type: "string" },
            target_slug: { type: "string" },
            relationship_code: { type: "string" },
          },
        },
      },
      event_links: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["event_id", "relation", "direction"],
          properties: {
            event_id: { type: "string" },
            relation: { type: "string", enum: ["triggers", "escalates", "follows", "mitigates", "relates_to"] },
            direction: { type: "string", enum: ["incoming", "outgoing"] },
          },
        },
      },
      predictions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["statement", "rationale", "probability", "horizon_days"],
          properties: {
            statement: { type: "string", description: "Falsifiable forecast — a specific, checkable future claim" },
            rationale: { type: "string" },
            probability: { type: "number", minimum: 0, maximum: 1, description: "Calibrated probability the claim comes true" },
            horizon_days: { type: "integer", minimum: 1, maximum: 730, description: "Days from now by which the claim resolves" },
          },
        },
      },
      analysis: {
        type: ["object", "null"],
        additionalProperties: false,
        required: [
          "what", "who", "when_text", "where_text", "why", "how",
          "impact", "risk", "opportunity", "scenario", "prediction", "recommendation",
          "impact_score", "risk_score", "opportunity_score", "confidence_score",
        ],
        properties: {
          what: { type: "string" },
          who: { type: "string" },
          when_text: { type: "string" },
          where_text: { type: "string" },
          why: { type: "string" },
          how: { type: "string" },
          impact: { type: "string" },
          risk: { type: "string" },
          opportunity: { type: "string" },
          scenario: { type: "string" },
          prediction: { type: "string" },
          recommendation: { type: "string" },
          impact_score: { type: "integer", minimum: 1, maximum: 5 },
          risk_score: { type: "integer", minimum: 1, maximum: 5 },
          opportunity_score: { type: "integer", minimum: 1, maximum: 5 },
          confidence_score: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
  },
} as const;

const SYSTEM_PROMPT = `Anda adalah mesin ekstraksi GSIP (Global Strategic Intelligence Platform),
platform intelijen strategis 5-layer untuk pengambil keputusan korporasi/BUMN Indonesia.

Tugas: nilai satu item berita, lalu (jika relevan) ekstrak menjadi payload terstruktur.

Aturan:
1. relevant=true HANYA jika berita bermakna strategis (kebijakan, regulasi, geopolitik,
   pergeseran pasar/teknologi/energi/komoditas yang berdampak luas). Gosip, olahraga,
   selebriti, berita lokal minor → relevant=false, event/analysis = null, array kosong.
2. Semua kode (event_type_code, domain_code, entity_type_code, relationship_code,
   gics_industry_code) WAJIB dipilih persis dari daftar ontologi yang diberikan.
3. Entitas: gunakan slug yang SUDAH ADA jika merujuk entitas dunia-nyata yang sama
   (lihat daftar existing_entities). Entitas baru: slug kebab-case bahasa Inggris,
   maksimal 6 entitas paling penting per event.
4. event_links: hanya jika event ini jelas terhubung kausal dengan salah satu
   recent_events (gunakan id persisnya). direction="incoming" berarti event lama
   memicu event baru ini.
5. Semua teks naratif (title, summary, description, seluruh analisis 5W1H, impact/risk/
   opportunity/scenario/prediction/recommendation, serta statement/rationale prediksi)
   ditulis dalam BAHASA INDONESIA yang ringkas dan analitis. Sudut pandang analisis:
   kepentingan strategis Indonesia.
6. Skor: importance & *_score skala 1-5; confidence 0-1 (keyakinan atas fakta sumber).
7. SOURCE GRADING (NATO Admiralty) — nilai secara terpisah:
   - source_reliability (A-F): keandalan SUMBER. A=kantor berita besar/dokumen resmi,
     C=media umum yang biasanya andal, E=sumber tak jelas/blog, F=tak bisa dinilai.
   - info_credibility (1-6): kredibilitas INFORMASI. 1=terkonfirmasi sumber lain,
     3=mungkin benar (belum terkonfirmasi), 5=tidak mungkin, 6=tak bisa dinilai.
   Untuk item feed berita tunggal tanpa korroborasi, default wajar: reliability C, credibility 3.
8. PREDICTIONS — buat 1-3 prediksi FALSIFIABLE (dapat diverifikasi benar/salah) yang
   mengikuti event ini. Setiap prediksi: statement spesifik & terukur (hindari kata kabur),
   probability terkalibrasi 0-1 (jangan selalu 0.5 — bedakan keyakinan), horizon_days
   (kapan klaim bisa dievaluasi), dan rationale singkat. Jika event tidak memungkinkan
   prediksi bermakna, kembalikan array kosong.`;

export async function extractIntel(item: FeedItem, ctx: OntologyContext): Promise<Extraction> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const user = JSON.stringify({
    news_item: {
      title: item.title,
      snippet: item.snippet,
      published: item.pubDate,
      source_feed: item.sourceId,
      url: item.link,
    },
    ontology: {
      domains: ctx.domains,
      event_types: ctx.eventTypes,
      entity_types: ctx.entityTypes,
      relationship_types: ctx.relationshipTypes,
      gics_industries: ctx.gicsIndustries,
    },
    existing_entities: ctx.existingEntities,
    recent_events: ctx.recentEvents,
  });

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: user },
      ],
      response_format: { type: "json_schema", json_schema: RESPONSE_SCHEMA },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned empty content");
  return JSON.parse(content) as Extraction;
}
