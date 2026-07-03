// Ingestion pipeline: RSS feeds → relevance gate + extraction (LLM) →
// gsip_ingest RPC (token-gated, transactional per event).

import { supabase } from "../supabase";
import { FEEDS } from "./sources";
import { fetchFeed, type FeedItem } from "./rss";
import { extractIntel, type OntologyContext } from "./extract";

export type IngestResult = {
  scanned: number;
  candidates: number;
  processed: number;
  created: number;
  skipped: number;
  errors: number;
  details: {
    title: string;
    url: string;
    status: "created" | "skipped" | "irrelevant" | "error";
    note: string | null;
    event_id?: string;
  }[];
};

async function loadOntology(): Promise<OntologyContext> {
  const [domains, eventTypes, entityTypes, relationshipTypes, gics, entities, recentEvents] =
    await Promise.all([
      supabase.from("domains").select("code,name").order("sort_order"),
      supabase.from("event_types").select("code,label").order("sort_order"),
      supabase.from("entity_types").select("code,label,category").order("sort_order"),
      supabase.from("relationship_types").select("code,label"),
      supabase.from("subsectors").select("code,name").order("sort_order"),
      supabase.from("entities").select("slug,name").order("created_at", { ascending: false }).limit(400),
      supabase.from("events").select("id,title,event_date").order("created_at", { ascending: false }).limit(25),
    ]);
  const fail = [domains, eventTypes, entityTypes, relationshipTypes, gics, entities, recentEvents]
    .find((r) => r.error);
  if (fail?.error) throw new Error(`ontology load failed: ${fail.error.message}`);
  return {
    domains: domains.data ?? [],
    eventTypes: eventTypes.data ?? [],
    entityTypes: entityTypes.data ?? [],
    relationshipTypes: relationshipTypes.data ?? [],
    gicsIndustries: gics.data ?? [],
    existingEntities: entities.data ?? [],
    recentEvents: recentEvents.data ?? [],
  };
}

/** Drop items whose source_url already exists in events. */
async function filterKnown(items: FeedItem[]): Promise<FeedItem[]> {
  if (items.length === 0) return items;
  const { data, error } = await supabase
    .from("events")
    .select("source_url")
    .in("source_url", items.map((i) => i.link));
  if (error) throw new Error(`dedup query failed: ${error.message}`);
  const known = new Set((data ?? []).map((r) => r.source_url));
  return items.filter((i) => !known.has(i.link));
}

export async function runIngest(opts?: { maxItems?: number }): Promise<IngestResult> {
  const token = process.env.GSIP_INGEST_TOKEN;
  if (!token) throw new Error("GSIP_INGEST_TOKEN is not set");
  const maxItems = opts?.maxItems ?? Number(process.env.GSIP_INGEST_MAX ?? 6);

  const feedResults = await Promise.allSettled(FEEDS.map(fetchFeed));
  const all: FeedItem[] = [];
  const seen = new Set<string>();
  for (const r of feedResults) {
    if (r.status !== "fulfilled") continue;
    for (const item of r.value) {
      if (seen.has(item.link)) continue;
      seen.add(item.link);
      all.push(item);
    }
  }

  const fresh = await filterKnown(all);
  const batch = fresh.slice(0, maxItems);

  const result: IngestResult = {
    scanned: all.length,
    candidates: fresh.length,
    processed: 0,
    created: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };
  if (batch.length === 0) return result;

  const ontology = await loadOntology();

  // Sequential on purpose: keeps LLM spend bounded and lets each event see
  // entities/events created by the previous one (via slug reuse in the RPC).
  for (const item of batch) {
    result.processed++;
    try {
      const extraction = await extractIntel(item, ontology);
      if (!extraction.relevant || !extraction.event) {
        result.skipped++;
        result.details.push({ title: item.title, url: item.link, status: "irrelevant", note: extraction.reason });
        continue;
      }
      const payload = {
        ...extraction.event,
        source_url: item.link,
        entities: extraction.entities,
        entity_edges: extraction.entity_edges,
        event_links: extraction.event_links,
        predictions: extraction.predictions,
        analysis: extraction.analysis,
      };
      const { data, error } = await supabase.rpc("gsip_ingest", {
        p_token: token,
        p_payload: payload,
      });
      if (error) throw new Error(error.message);
      if (data?.skipped) {
        result.skipped++;
        result.details.push({ title: item.title, url: item.link, status: "skipped", note: data.reason ?? null });
      } else {
        result.created++;
        result.details.push({
          title: extraction.event.title,
          url: item.link,
          status: "created",
          note: `entities +${data.entities_created}, edges +${data.entity_edges_created}, links +${data.event_links_created}`,
          event_id: data.event_id,
        });
      }
    } catch (err) {
      result.errors++;
      result.details.push({
        title: item.title,
        url: item.link,
        status: "error",
        note: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return result;
}
